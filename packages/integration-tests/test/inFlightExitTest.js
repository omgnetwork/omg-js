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
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
})
let rootChain

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.

describe('In-flight Exit tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction exit (ci-enabled)', function () {
    let INTIIAL_ALICE_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
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
      // Send TRANSFER_AMOUNT from Alice to Bob
      let bobSpentOnGas
      const { txbytes, result } = await ccHelper.sendAndWait(
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

      // For whatever reason, Bob hasn't seen the transaction get put into a block
      // and he wants to exit.

      // Get the exit data
      const decodedTx = transaction.decodeTxBytes(txbytes)
      const exitData = await childChain.inFlightExitGetData(txbytes)
      assert.hasAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      const hasToken = await rootChain.hasToken(transaction.ETH_CURRENCY)
      if (!hasToken) {
        console.log(`Adding a ${transaction.ETH_CURRENCY} exit queue`)
        const addTokenCall = await rootChain.addToken(
          transaction.ETH_CURRENCY,
          { from: bobAccount.address, privateKey: bobAccount.privateKey }
        )
        bobSpentOnGas = await rcHelper.spentOnGas(web3, addTokenCall)
      } else {
        console.log(`Exit queue for ${transaction.ETH_CURRENCY} already exists`)
        bobSpentOnGas = numberToBN(0)
      }

      // Start an in-flight exit.
      let receipt = await rootChain.startInFlightExit(
        exitData.in_flight_tx,
        exitData.input_txs,
        exitData.input_utxos_pos,
        ['0x'],
        exitData.input_txs_inclusion_proofs,
        decodedTx.sigs,
        exitData.in_flight_tx_sigs,
        ['0x'],
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`
      )

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Decode the transaction to get the index of Bob's output
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob needs to piggyback his output on the in-flight exit
      receipt = await rootChain.piggybackInFlightExitOnOutput(
        exitData.in_flight_tx,
        outputIndex,
        '0x',
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Call processExits before the challenge period is over
      receipt = await rootChain.processExits(transaction.ETH_CURRENCY, 0, 20, {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      })
      console.log(
        `Bob called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const utxoPos = transaction.encodeUtxoPos({
        blknum: result.blknum,
        txindex: result.txindex,
        oindex: outputIndex
      })
      const toWait = await rcHelper.getTimeToExit(
        rootChain.plasmaContract,
        utxoPos
      )
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      // Call processExits again.
      receipt = await rootChain.processExits(transaction.ETH_CURRENCY, 0, 20, {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Bob's ETH balance
      bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3.utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })

    it('should succesfully exit a ChildChain transaction that is not included', async function () {
      // Create a transaction that sends TRANSFER_AMOUNT from Alice to Bob, but don't submit it to the childchain
      let bobSpentOnGas = numberToBN(0)
      const bobTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // For whatever reason, Bob hasn't seen the transaction get put into a block
      // and he wants to exit.

      // Get the exit data
      const decodedTx = transaction.decodeTxBytes(bobTx)
      const exitData = await childChain.inFlightExitGetData(bobTx)
      assert.hasAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      const hasToken = await rootChain.hasToken(transaction.ETH_CURRENCY)
      if (!hasToken) {
        console.log(`Adding a ${transaction.ETH_CURRENCY} exit queue`)
        const addTokenCall = await rootChain.addToken(
          transaction.ETH_CURRENCY,
          {
            from: bobAccount.address,
            privateKey: bobAccount.privateKey
          }
        )
        bobSpentOnGas = await rcHelper.spentOnGas(web3, addTokenCall)
      } else {
        console.log(`Exit queue for ${transaction.ETH_CURRENCY} already exists`)
        bobSpentOnGas = numberToBN(0)
      }

      // Start an in-flight exit.
      let receipt = await rootChain.startInFlightExit(
        exitData.in_flight_tx,
        exitData.input_txs,
        exitData.input_utxos_pos,
        ['0x'],
        exitData.input_txs_inclusion_proofs,
        decodedTx.sigs,
        exitData.in_flight_tx_sigs,
        ['0x'],
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`
      )

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Decode the transaction to get the index of Bob's output
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob needs to piggyback his output on the in-flight exit
      receipt = await rootChain.piggybackInFlightExitOnOutput(
        exitData.in_flight_tx,
        outputIndex,
        '0x',
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Call processExits before the challenge period is over
      receipt = await rootChain.processExits(transaction.ETH_CURRENCY, 0, 20, {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      })
      console.log(
        `Bob called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const toWait = await rcHelper.getTimeToExit(rootChain.plasmaContract)
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      // Call processExits again.
      receipt = await rootChain.processExits(transaction.ETH_CURRENCY, 0, 20, {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Bob's ETH balance
      bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3.utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })

    it.only('should succesfully exit a ChildChain with piggybacking input transaction that is not included', async function () {
      // Create a transaction that sends TRANSFER_AMOUNT from Alice to Bob, but don't submit it to the childchain
      const bobTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // For whatever reason, Bob hasn't seen the transaction get put into a block
      // and he wants to exit.

      // Get the exit data
      const decodedTx = transaction.decodeTxBytes(bobTx)
      const exitData = await childChain.inFlightExitGetData(bobTx)
      assert.hasAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      const hasToken = await rootChain.hasToken(transaction.ETH_CURRENCY)
      if (!hasToken) {
        console.log(`Adding a ${transaction.ETH_CURRENCY} exit queue`)
        await rootChain.addToken(
          transaction.ETH_CURRENCY,
          {
            from: bobAccount.address,
            privateKey: bobAccount.privateKey
          }
        )
      } else {
        console.log(`Exit queue for ${transaction.ETH_CURRENCY} already exists`)
      }

      // Start an in-flight exit.
      let receipt = await rootChain.startInFlightExit(
        exitData.in_flight_tx,
        exitData.input_txs,
        exitData.input_utxos_pos,
        ['0x'],
        exitData.input_txs_inclusion_proofs,
        decodedTx.sigs,
        exitData.in_flight_tx_sigs,
        ['0x'],
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`
      )

      // Alice try to piggyback the input
      receipt = await rootChain.piggybackInFlightExitOnInput(
        exitData.in_flight_tx,
        0,
        {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      )

      console.log(
        `Alice called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      )

      // Wait for challenge period
      const toWait = await rcHelper.getTimeToExit(rootChain.plasmaContract)
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      receipt = await rootChain.processExits(transaction.ETH_CURRENCY, 0, 20, {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Bob's ETH balance
      const aliceBalance = await web3.eth.getBalance(aliceAccount.address)
      const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT)

      assert.equal(aliceBalance.toString(), expected.toString())
    })
  })
})
