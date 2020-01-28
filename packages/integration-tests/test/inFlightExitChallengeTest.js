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
const chai = require('chai')
const numberToBN = require('number-to-bn')
const assert = chai.assert

describe('inFlightExitChallengeTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchainContract })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  before(async function () {
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction challenge exit with competitor', function () {
    let INTIIAL_ALICE_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let INTIIAL_CAROL_RC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount
    let carolAccount
    let fundAliceTx

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('1', 'ether')
      INTIIAL_CAROL_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      carolAccount = rcHelper.createAccount(web3)
      console.log(`Created Carol account ${JSON.stringify(carolAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx))

      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(
        web3,
        carolAccount.address,
        INTIIAL_CAROL_RC_AMOUNT
      )

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          carolAccount.address,
          INTIIAL_CAROL_RC_AMOUNT
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
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
        await faucet.returnFunds(web3, carolAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should challenge an in-flight exit by providing a competitor', async function () {
      const bobSpentOnGas = numberToBN(0)
      // Alice creates a transaction to send funds to Bob
      const bobTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await childChain.inFlightExitGetData(bobTx)
      assert.hasAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      // Starts the in-flight exit
      const bobEthBalanceBeforeIfe = await web3.eth.getBalance(
        bobAccount.address
      )
      const ifeReceipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: exitData.in_flight_tx_sigs,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      const bobEthBalanceAfterIfe = await web3.eth.getBalance(
        bobAccount.address
      )
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`
      )
      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, ifeReceipt))

      const { bonds } = await rootChain.getPaymentExitGame()
      assert.equal(
        web3.utils
          .toBN(bobEthBalanceBeforeIfe)
          .sub(web3.utils.toBN(bobEthBalanceAfterIfe))
          .sub(bobSpentOnGas)
          .toString(),
        web3.utils.toBN(bonds.inflightExit).toString()
      )

      // Decode the transaction to get the index of Bob's output
      const decodedTx = transaction.decodeTxBytes(bobTx)
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob piggybacks his output on the in-flight exit
      let receipt = await rootChain.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction _does_ get put into a block.
      const carolTx = await ccHelper.sendAndWait(
        childChain,
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT,
        rootChain.plasmaContractAddress
      )

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = transaction.decodeTxBytes(carolTx.txbytes)
      const cInput = carolTxDecoded.inputs[0]
      const inflightExit = await ccHelper.waitForEvent(
        childChain,
        'in_flight_exits',
        e => {
          const decoded = transaction.decodeTxBytes(e.txbytes)
          return decoded.inputs.find(
            input =>
              input.blknum === cInput.blknum &&
              input.txindex === cInput.txindex &&
              input.oindex === cInput.oindex
          )
        }
      )

      // Carol gets the competitor of Bob's exit
      const competitor = await childChain.inFlightExitGetCompetitor(
        inflightExit.txbytes
      )
      console.log('Got competitor')
      assert.hasAllKeys(competitor, [
        'in_flight_txbytes',
        'in_flight_input_index',
        'competing_txbytes',
        'competing_input_index',
        'competing_tx_pos',
        'competing_proof',
        'competing_sig',
        'input_tx',
        'input_utxo_pos'
      ])
      // Challenge the IFE as non canonical
      receipt = await rootChain.challengeInFlightExitNotCanonical({
        inputTx: competitor.input_tx,
        inputUtxoPos: competitor.input_utxo_pos,
        inFlightTx: competitor.in_flight_txbytes,
        inFlightTxInputIndex: competitor.in_flight_input_index,
        competingTx: competitor.competing_txbytes,
        competingTxInputIndex: competitor.competing_input_index,
        competingTxPos: competitor.competing_tx_pos,
        competingTxInclusionProof: competitor.competing_proof,
        competingTxWitness: competitor.competing_sig,
        txOptions: {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      })
      // Keep track of how much Carol spends on gas
      const carolSpentOnGas = await rcHelper.spentOnGas(web3, receipt)
      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

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
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Bob's IFE was not successful, so he loses his exit bond.
      // INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND - PIGGYBACK_BOND - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3.utils.toBN(bonds.inflightExit))
        .sub(web3.utils.toBN(bonds.piggyback))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())

      // Get carol's ETH balance
      const carolEthBalance = await web3.eth.getBalance(carolAccount.address)
      // carol got Bob's exit bond, so expect her balance to be
      // INTIIAL_CAROL_AMOUNT + INFLIGHT_EXIT_BOND - gas spent
      const carolExpected = web3.utils
        .toBN(INTIIAL_CAROL_RC_AMOUNT)
        .add(web3.utils.toBN(bonds.inflightExit))
        .sub(carolSpentOnGas)
      assert.equal(carolEthBalance.toString(), carolExpected.toString())
    })
  })

  describe('in-flight transaction challenge exit without competitor', function () {
    let INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    let INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('1', 'ether')
    let INTIIAL_CAROL_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
    let TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
    let aliceAccount
    let bobAccount
    let carolAccount
    let fundAliceTx

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('1', 'ether')
      INTIIAL_CAROL_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      carolAccount = rcHelper.createAccount(web3)
      console.log(`Created Carol account ${JSON.stringify(carolAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx))
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(
        web3,
        carolAccount.address,
        INTIIAL_CAROL_RC_AMOUNT
      )

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          carolAccount.address,
          INTIIAL_CAROL_RC_AMOUNT
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
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
        await faucet.returnFunds(web3, carolAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should challenge an in-flight exit as non canonical', async function () {
      // Alice creates a transaction to send funds to Bob
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

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await childChain.inFlightExitGetData(bobTx)
      assert.hasAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      // Starts the in-flight exit
      const ifeReceipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: exitData.in_flight_tx_sigs,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`
      )

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, ifeReceipt))

      // Decode the transaction to get the index of Bob's output
      const decodedTx = transaction.decodeTxBytes(bobTx)
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob piggybacks his output on the in-flight exit
      let receipt = await rootChain.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction doesn't get put into a block either.
      const carolTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = transaction.decodeTxBytes(carolTx)
      const cInput = carolTxDecoded.inputs[0]
      const inflightExit = await ccHelper.waitForEvent(
        childChain,
        'in_flight_exits',
        e => {
          const decoded = transaction.decodeTxBytes(e.txbytes)
          return decoded.inputs.find(
            input =>
              input.blknum === cInput.blknum &&
              input.txindex === cInput.txindex &&
              input.oindex === cInput.oindex
          )
        }
      )

      // Carol's tx was not put into a block, but it can still be used to challenge Bob's IFE as non-canonical
      const utxoPosOutput = transaction.encodeUtxoPos({
        blknum: fundAliceTx.result.blknum,
        txindex: fundAliceTx.result.txindex,
        oindex: 0
      }).toNumber()

      const unsignInput = transaction.encode(transaction.decodeTxBytes(fundAliceTx.txbytes), { signed: false })
      const unsignCarolTx = transaction.encode(carolTxDecoded, { signed: false })
      receipt = await rootChain.challengeInFlightExitNotCanonical({
        inputTx: unsignInput,
        inputUtxoPos: utxoPosOutput,
        inFlightTx: inflightExit.txbytes,
        inFlightTxInputIndex: 0,
        competingTx: unsignCarolTx,
        competingTxInputIndex: 0,
        competingTxPos: '0x',
        competingTxInclusionProof: '0x',
        competingTxWitness: carolTxDecoded.sigs[0],
        txOptions: {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      })
      // Keep track of how much Carol spends on gas
      const carolSpentOnGas = await rcHelper.spentOnGas(web3, receipt)

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 5,
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
      const { bonds } = await rootChain.getPaymentExitGame()
      // Get Bob's ETH balance
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Bob's IFE was not successful, so he loses his exit bond.
      // INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND - PIGGYBACK_BOND - gas spent
      const expected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3.utils.toBN(bonds.inflightExit))
        .sub(web3.utils.toBN(bonds.piggyback))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())

      // Get carol's ETH balance
      const carolEthBalance = await web3.eth.getBalance(carolAccount.address)
      // carol got Bob's exit bond, so expect her balance to be
      // INTIIAL_CAROL_AMOUNT + INFLIGHT_EXIT_BOND - gas spent
      const carolExpected = web3.utils
        .toBN(INTIIAL_CAROL_RC_AMOUNT)
        .add(web3.utils.toBN(bonds.inflightExit))
        .sub(carolSpentOnGas)
      assert.equal(carolEthBalance.toString(), carolExpected.toString())
    })
  })
})
