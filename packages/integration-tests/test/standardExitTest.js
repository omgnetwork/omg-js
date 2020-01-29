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
const faucet = require('../helpers/faucet')
const Web3 = require('web3')
const numberToBN = require('number-to-bn')
const erc20abi = require('human-standard-token-abi')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const scriptName = path.basename(__filename)

describe('standardExitTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })

  before(async function () {
    await faucet.init(rootChain, childChain, web3, config, scriptName)
  })

  describe('Deposit transaction exit', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('.0001', 'ether')

    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully exit a deposit', async function () {
      // Alice deposits ETH into the Plasma contract
      let receipt = await rootChain.deposit({
        amount: DEPOSIT_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
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
        utxoPos: exitData.utxo_pos,
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
      if (receipt) {
        console.log(`Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))
        await rcHelper.awaitTx(web3, receipt.transactionHash)
      }

      // Get Alice's ETH balance
      let aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be less than INTIIAL_ALICE_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(aliceEthBalance), Number(INTIIAL_ALICE_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
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
      if (receipt) {
        console.log(`Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))
        await rcHelper.awaitTx(web3, receipt.transactionHash)
      }

      // Get Alice's ETH balance
      aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_ALICE_AMOUNT)
        .sub(aliceSpentOnGas)
      assert.equal(aliceEthBalance.toString(), expected.toString())
    })
  })

  describe('childchain transaction exit', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)
      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
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

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
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
        utxoPos: exitData.utxo_pos,
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
      if (processExitReceiptBefore) {
        console.log(`Bob called RootChain.processExits() before challenge period: txhash = ${processExitReceiptBefore.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, processExitReceiptBefore))
        await rcHelper.awaitTx(web3, processExitReceiptBefore.transactionHash)
      }

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: startStandardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
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
      if (processExitReceiptAfter) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${processExitReceiptAfter.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, processExitReceiptAfter))
        await rcHelper.awaitTx(web3, processExitReceiptAfter.transactionHash)
      }

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

  describe('ERC20 exit', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const testErc20Contract = new web3.eth.Contract(erc20abi, config.erc20_contract_address)
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('.1', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 2
    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      await Promise.all([
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ERC20,
          ERC20_CURRENCY
        ),
        faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
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

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
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
        'amount',
        'creating_txhash',
        'spending_txhash'
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
        utxoPos: exitData.utxo_pos,
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
        token: config.erc20_contract_address,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        await rcHelper.awaitTx(web3, receipt.transactionHash)
      }

      let balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, 0)

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await rootChain.processExits({
        token: config.erc20_contract_address,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        await rcHelper.awaitTx(web3, receipt.transactionHash)
      }

      balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, INTIIAL_ALICE_AMOUNT_ERC20)
    })
  })
})
