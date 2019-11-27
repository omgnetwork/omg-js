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
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction exit (ci-enabled)', function () {
    let INTIIAL_ALICE_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
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
      const bobSpentOnGas = numberToBN(0)
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

      // Start an in-flight exit.
      let receipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        outputGuardPreimagesForInputs: ['0x'],
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: decodedTx.sigs,
        signatures: exitData.in_flight_tx_sigs,
        inputSpendingConditionOptionalArgs: ['0x'],
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
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
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
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
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
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
      const bobSpentOnGas = numberToBN(0)
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

      // Start an in-flight exit.
      let receipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        outputGuardPreimagesForInputs: ['0x'],
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: decodedTx.sigs,
        signatures: exitData.in_flight_tx_sigs,
        inputSpendingConditionOptionalArgs: ['0x'],
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
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
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
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
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
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

    it('should succesfully exit a ChildChain with piggybacking input transaction that is not included', async function () {
      const aliceSpentOnGas = numberToBN(0)
      const kelvinSpentOnGas = numberToBN(0)
      // fund some ETH for alice on rootchain so she can piggyback / challenge
      await faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)

      // we need the 3rd guy here, introducing kelvin which he will do a double spend
      const INTIIAL_KELVIN_AMOUNT = web3.utils.toWei('.3', 'ether')
      const kelvinAccount = rcHelper.createAccount(web3)
      console.log(`Created Kelvin account ${JSON.stringify(bobAccount)}`)

      await faucet.fundRootchainEth(web3, kelvinAccount.address, INTIIAL_KELVIN_AMOUNT)
      await rcHelper.waitForEthBalanceEq(web3, kelvinAccount.address, INTIIAL_KELVIN_AMOUNT)

      const fundKelvinTx = await faucet.fundChildchain(
        kelvinAccount.address,
        INTIIAL_KELVIN_AMOUNT,
        transaction.ETH_CURRENCY
      )

      await ccHelper.waitForBalanceEq(
        childChain,
        kelvinAccount.address,
        INTIIAL_KELVIN_AMOUNT
      )

      const kelvinUtxos = await childChain.getUtxos(kelvinAccount.address)
      const aliceUtxos = await childChain.getUtxos(aliceAccount.address)

      // kelvin and alice create a tx to send to bob
      const txBody = {
        inputs: [kelvinUtxos[0], aliceUtxos[0]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: numberToBN(INTIIAL_KELVIN_AMOUNT).add(numberToBN(INTIIAL_ALICE_AMOUNT))
        }]
      }

      const typedData = transaction.getTypedData(txBody, rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [kelvinAccount.privateKey, aliceAccount.privateKey])
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      const exitData = await childChain.inFlightExitGetData(signedTx)

      // kelvin double spend its utxo to bob
      const kelvinToBobTx = await ccHelper.createTx(
        childChain,
        kelvinAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        kelvinAccount.privateKey,
        rootChain.plasmaContractAddress
      )

      // kelvin Start an in-flight exit because he wants to cheat the system
      let receipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        outputGuardPreimagesForInputs: ['0x', '0x'],
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: signatures,
        signatures: exitData.in_flight_tx_sigs,
        inputSpendingConditionOptionalArgs: ['0x', '0x'],
        txOptions: {
          privateKey: kelvinAccount.privateKey,
          from: kelvinAccount.address
        }
      })
      console.log(
        `Kelvin called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`
      )

      kelvinSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Alice sees that Kelvin is trying to exit the same input that Kelvin sent to bob.
      const kelvinToBobDecoded = transaction.decodeTxBytes(kelvinToBobTx)
      const kInput = kelvinToBobDecoded.inputs[0]

      const inflightExit = await ccHelper.waitForEvent(
        childChain,
        'in_flight_exits',
        e => {
          const decoded = transaction.decodeTxBytes(e.txbytes)
          return decoded.inputs.find(
            input =>
              input.blknum === kInput.blknum &&
              input.txindex === kInput.txindex &&
              input.oindex === kInput.oindex
          )
        }
      )

      // Alice needs to piggyback his input on the in-flight exit
      receipt = await rootChain.piggybackInFlightExitOnInput(
        exitData.in_flight_tx,
        1, // inputIndex of alice
        {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      )

      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      console.log(
              `Alice called RootChain.piggybackInFlightExitOnInput() : txhash = ${receipt.transactionHash}`
      )

      // alice need to prove that the IFE is non-canonical so she the piggyback input works
      const utxoPosOutput = transaction.encodeUtxoPos({
        blknum: fundKelvinTx.result.blknum,
        txindex: fundKelvinTx.result.txindex,
        oindex: 0
      }).toNumber()

      const unsignInput = transaction.encode(transaction.decodeTxBytes(fundKelvinTx.txbytes), { signed: false })
      const unsignKelvinToBobTx = transaction.encode(kelvinToBobDecoded, { signed: false })
      receipt = await rootChain.challengeInFlightExitNotCanonical({
        inputTx: unsignInput,
        inputUtxoPos: utxoPosOutput,
        inFlightTx: inflightExit.txbytes,
        inFlightTxInputIndex: 0,
        competingTx: unsignKelvinToBobTx,
        competingTxInputIndex: 0,
        competingTxWitness: kelvinToBobDecoded.sigs[0],
        outputGuardPreimage: '0x',
        competingTxPos: '0x',
        competingTxInclusionProof: '0x',
        competingTxConfirmSig: '0x',
        competingTxSpendingConditionOptionalArgs: '0x',
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })

      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Wait for challenge period
      const toWait = await rcHelper.getTimeToExit(rootChain.plasmaContract)
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      // Call processExits.
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Alice's ETH balance
      const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_ALICE_AMOUNT) // ETH exited amount that funded to cc directly
        .add(numberToBN(INTIIAL_ALICE_AMOUNT)) // ETH funded initially
        .sub(aliceSpentOnGas)
        .add(numberToBN(rootChain.getInflightExitBond())) // since alice challenged the invalid IFE, she gets the bond
      assert.equal(aliceEthBalance.toString(), expected.toString())

      // kelvin rootchain balance should be equal to initial because he double spent, hence the utxo should still be in childchain
      const kelvinEthBalance = await web3.eth.getBalance(kelvinAccount.address)
      const kelvinExpectedBalance = numberToBN(INTIIAL_KELVIN_AMOUNT).sub(kelvinSpentOnGas).sub(rootChain.getInflightExitBond())
      assert.equal(kelvinEthBalance.toString(), kelvinExpectedBalance.toString())
    })
  })
})
