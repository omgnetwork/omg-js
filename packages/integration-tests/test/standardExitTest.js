/*
Copyright 2019 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const config = require('../test-config')
const rcHelper = require('../helpers/rootChainHelper')
const ccHelper = require('../helpers/childChainHelper')
const faucet = require('../helpers/testFaucet')
const Web3 = require('web3')
const numberToBN = require('number-to-bn')
const erc20abi = require('human-standard-token-abi')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
let rootChain

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.

describe('Standard Exit tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('Deposit transaction exit (ci-enabled)', function () {
    let INTIIAL_ALICE_AMOUNT
    let DEPOSIT_AMOUNT
    let aliceAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
      DEPOSIT_AMOUNT = web3.utils.toWei('.0001', 'ether')
      // Create and fund Alice's account
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      await faucet.fundRootchainEth(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )
      await rcHelper.waitForEthBalanceEq(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )
    })

    afterEach(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully exit a deposit', async function () {
      // Alice deposits ETH into the Plasma contract
      let receipt = await rcHelper.depositEth({
        rootChain,
        address: aliceAccount.address,
        amount: DEPOSIT_AMOUNT,
        privateKey: aliceAccount.privateKey
      })
      await ccHelper.waitForBalanceEq(
        childChain,
        aliceAccount.address,
        DEPOSIT_AMOUNT
      )
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)

      // Keep track of how much Alice spends on gas
      const aliceSpentOnGas = await rcHelper.spentOnGas(web3, receipt)
      console.log(`aliceSpentOnGas = ${aliceSpentOnGas}`)

      // Alice wants to exit without having transacted on the childchain

      // Get Alice's deposit utxo
      const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 1)
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

      // Get the exit data
      const utxoToExit = aliceUtxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const standardExitReceipt = await rootChain.startStandardExit({
        outputId: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`
      )
      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, standardExitReceipt))

      // Call processExits before the challenge period is over
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`
      )

      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Get Alice's ETH balance
      let aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be less than INTIIAL_ALICE_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(aliceEthBalance), Number(INTIIAL_ALICE_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum,
        isDeposit: true
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization}ms`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )
      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Get Alice's ETH balance
      aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_ALICE_AMOUNT)
        .sub(aliceSpentOnGas)
      assert.equal(aliceEthBalance.toString(), expected.toString())
    })
  })

  describe('childchain transaction exit (ci-enabled)', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
    let aliceAccount
    let bobAccount

    before(async function () {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          bobAccount.address,
          INTIIAL_BOB_RC_AMOUNT
        )
      ])
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully exit a ChildChain transaction', async function () {
      // Track total gas used
      const bobSpentOnGas = numberToBN(0)

      // Send TRANSFER_AMOUNT from Alice to Bob
      await ccHelper.sendAndWait(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT,
        rootChain.plasmaContractAddress
      )

      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // Bob wants to exit
      const bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 1)
      assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

      // Get the exit data
      const utxoToExit = bobUtxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const startStandardExitReceipt = await rootChain.startStandardExit({
        outputId: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.startExit(): txhash = ${startStandardExitReceipt.transactionHash}`
      )

      bobSpentOnGas.iadd(
        await rcHelper.spentOnGas(web3, startStandardExitReceipt)
      )

      // Call processExits before the challenge period is over
      const processExitReceiptBefore = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.processExits() before challenge period: txhash = ${processExitReceiptBefore.transactionHash}`
      )
      bobSpentOnGas.iadd(
        await rcHelper.spentOnGas(web3, processExitReceiptBefore)
      )

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: startStandardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization}ms`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      const processExitReceiptAfter = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${processExitReceiptAfter.transactionHash}`
      )
      bobSpentOnGas.iadd(
        await rcHelper.spentOnGas(web3, processExitReceiptAfter)
      )

      // Get Bob's ETH balance
      bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3.utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })

  describe('ERC20 exit (ci-enabled)', function () {
    const ERC20_CURRENCY = config.testErc20Contract
    const testErc20Contract = new web3.eth.Contract(
      erc20abi,
      config.testErc20Contract
    )
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('.1', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 2
    let aliceAccount

    before(async function () {
      // Create and fund Alice's account
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      await Promise.all([
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ERC20,
          ERC20_CURRENCY
        ),
        faucet.fundRootchainEth(
          web3,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ETH
        )
      ])

      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ERC20,
          ERC20_CURRENCY
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ETH
        )
      ])
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should exit ERC20 tokens', async function () {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], [
        'utxo_pos',
        'txindex',
        'owner',
        'oindex',
        'currency',
        'blknum',
        'amount'
      ])
      assert.equal(utxos[0].amount, INTIIAL_ALICE_AMOUNT_ERC20)
      assert.equal(
        utxos[0].currency.toLowerCase(),
        ERC20_CURRENCY.toLowerCase()
      )

      // Get the exit data
      const utxoToExit = utxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const standardExitReceipt = await rootChain.startStandardExit({
        outputId: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`
      )

      // Call processExits before the challenge period is over
      let receipt = await rootChain.processExits({
        token: config.testErc20Contract,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`
      )
      let balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, 0)

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization}ms`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await rootChain.processExits({
        token: config.testErc20Contract,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )
      balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, INTIIAL_ALICE_AMOUNT_ERC20)
    })
  })
})
