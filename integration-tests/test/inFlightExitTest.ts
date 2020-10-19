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

import Web3 from 'web3';
import BN from 'bn.js';
import web3Utils from 'web3-utils';
import path from 'path';
import { assert, should, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import OmgJS from '../..';

import faucet from '../helpers/faucet';
import * as rcHelper from '../helpers/rootChainHelper';
import * as ccHelper from '../helpers/childChainHelper';
import config from '../test-config';

should();
use(chaiAsPromised);

const faucetName = path.basename(__filename)

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('inFlightExitTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('in-flight transaction exit', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.4', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.4', 'ether')
    const TRANSFER_AMOUNT = web3Utils.toWei('0.0002', 'ether')

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          OmgJS.currency.ETH
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
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
      // Send TRANSFER_AMOUNT from Alice to Bob
      const bobSpentOnGas = new BN(0)
      const { txbytes, result } = await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // For whatever reason, Bob hasn't seen the transaction get put into a block
      // and he wants to exit.

      // Get the exit data
      const exitData = await omgjs.inFlightExitGetData(txbytes)
      assert.containsAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      // test we can get more exit information from the contract using the exitId
      const exitId = await omgjs.getInFlightExitId(txbytes)
      const alternativeExitData = await omgjs.getInFlightExitContractData([exitId])
      assert.lengthOf(alternativeExitData, 1)

      // Start an in-flight exit.
      const ifeReceipt = await omgjs.startInFlightExit({
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
      console.log(`Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt))

      // Decode the transaction to get the index of Bob's output
      const decodedTx = omgjs.decodeTransaction(txbytes)
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob needs to piggyback his output on the in-flight exit
      let receipt = await omgjs.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })

      console.log(`Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))

      // Call processExits before the challenge period is over
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (receipt) {
        console.log(`Bob called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Bob's ETH balance
      let bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (receipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Bob's ETH balance
      bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3Utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })

    it('should succesfully exit a ChildChain transaction that is not included', async function () {
      // Create a transaction that sends TRANSFER_AMOUNT from Alice to Bob, but don't submit it to the childchain
      const bobSpentOnGas = new BN(0)
      const bobTx = await ccHelper.createTx(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // For whatever reason, Bob hasn't seen the transaction get put into a block
      // and he wants to exit.

      // Get the exit data
      const exitData = await omgjs.inFlightExitGetData(bobTx)
      assert.containsAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ])

      // Start an in-flight exit.
      const ifeReceipt = await omgjs.startInFlightExit({
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
      console.log(`Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt))

      // Decode the transaction to get the index of Bob's output
      const decodedTx = omgjs.decodeTransaction(bobTx)
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      )

      // Bob needs to piggyback his output on the in-flight exit
      let receipt = await omgjs.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })

      console.log(`Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))

      // Call processExits before the challenge period is over
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (receipt) {
        console.log(`Bob called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Bob's ETH balance
      let bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address)
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: aliceUtxos[0].blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (receipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Bob's ETH balance
      bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3Utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })

    it.only('should succesfully exit a ChildChain with piggybacking input transaction that is not included', async function () {
      const aliceSpentOnGas = new BN(0)
      const kelvinSpentOnGas = new BN(0)
      // fund some ETH for alice on rootchain so she can piggyback / challenge
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)

      // we need the 3rd guy here, introducing kelvin which he will do a double spend
      const INTIIAL_KELVIN_AMOUNT = web3Utils.toWei('.3', 'ether')
      const kelvinAccount = rcHelper.createAccount()
      console.log(`Created Kelvin account ${JSON.stringify(bobAccount)}`)

      await faucet.fundRootchainEth(kelvinAccount.address, INTIIAL_KELVIN_AMOUNT)
      await rcHelper.waitForEthBalanceEq(kelvinAccount.address, INTIIAL_KELVIN_AMOUNT)

      const fundKelvinTx = await faucet.fundChildchain(
        kelvinAccount.address,
        INTIIAL_KELVIN_AMOUNT,
        OmgJS.currency.ETH
      )

      await ccHelper.waitForBalanceEq(
        kelvinAccount.address,
        INTIIAL_KELVIN_AMOUNT
      )

      const kelvinUtxos = await omgjs.getUtxos(kelvinAccount.address)
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address)

      // kelvin and alice create a tx to send to bob
      const txBody = {
        inputs: [kelvinUtxos[0], aliceUtxos[0]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: new BN(INTIIAL_KELVIN_AMOUNT).add(new BN(INTIIAL_ALICE_AMOUNT))
        }]
      }

      const typedData = omgjs.getTypedData(txBody)
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [kelvinAccount.privateKey, aliceAccount.privateKey] })
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const exitData = await omgjs.inFlightExitGetData(signedTx)

      // kelvin double spend its utxo to bob
      const kelvinToBobTx = await ccHelper.createTx(
        kelvinAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        kelvinAccount.privateKey
      )

      // kelvin Start an in-flight exit because he wants to cheat the system
      const ifeReceipt = await omgjs.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: exitData.in_flight_tx_sigs,
        txOptions: {
          privateKey: kelvinAccount.privateKey,
          from: kelvinAccount.address
        }
      })
      console.log(`Kelvin called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`)

      kelvinSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt))

      // Alice sees that Kelvin is trying to exit the same input that Kelvin sent to bob.
      const kelvinToBobDecoded = omgjs.decodeTransaction(kelvinToBobTx)
      const kInput = kelvinToBobDecoded.inputs[0]

      const inflightExit = await ccHelper.waitForEvent(
        'in_flight_exits',
        e => {
          const decoded = omgjs.decodeTransaction(e.txbytes)
          return decoded.inputs.find(
            input =>
              input.blknum === kInput.blknum &&
              input.txindex === kInput.txindex &&
              input.oindex === kInput.oindex
          )
        }
      )

      // Alice needs to piggyback her input on the in-flight exit
      let receipt = await omgjs.piggybackInFlightExitOnInput({
        inFlightTx: exitData.in_flight_tx,
        inputIndex: 1, // inputIndex of alice
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })

      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))

      console.log(`Alice called RootChain.piggybackInFlightExitOnInput() : txhash = ${receipt.transactionHash}`)

      // alice need to prove that the IFE is non-canonical so she the piggyback input works
      const utxoPosOutput = omgjs.encodeUtxoPos({
        blknum: fundKelvinTx.result.blknum,
        txindex: fundKelvinTx.result.txindex,
        oindex: 0
      }).toNumber()

      const unsignInput = omgjs.encodeTransaction({ ...omgjs.decodeTransaction(fundKelvinTx.txbytes), signed: false })
      const unsignKelvinToBobTx = omgjs.encodeTransaction({ ...kelvinToBobDecoded, signed: false })
      receipt = await omgjs.challengeInFlightExitNotCanonical({
        inputTx: unsignInput,
        inputUtxoPos: utxoPosOutput,
        inFlightTx: inflightExit.txbytes,
        inFlightTxInputIndex: 0,
        competingTx: unsignKelvinToBobTx,
        competingTxInputIndex: 0,
        competingTxPos: '0x',
        competingTxInclusionProof: '0x',
        competingTxWitness: kelvinToBobDecoded.sigs[0],
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      });

      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundKelvinTx.result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (receipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      const { bonds } = await omgjs.getPaymentExitGame()
      // Get Alice's ETH balance
      const aliceEthBalance = await omgjs.getRootchainETHBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT - gas spent

      const expected = new BN(INTIIAL_ALICE_AMOUNT) // ETH exited amount that funded to cc directly
        .add(new BN(INTIIAL_ALICE_AMOUNT)) // ETH funded initially
        .sub(aliceSpentOnGas)
        .add(new BN(bonds.inflightExit.toString())) // since alice challenged the invalid IFE, she gets the bond
      assert.equal(aliceEthBalance.toString(), expected.toString())

      // kelvin rootchain balance should be equal to initial because he double spent, hence the utxo should still be in childchain
      const kelvinEthBalance = await omgjs.getRootchainETHBalance(kelvinAccount.address)
      const kelvinExpectedBalance = new BN(INTIIAL_KELVIN_AMOUNT)
        .sub(kelvinSpentOnGas)
        .sub(new BN(bonds.inflightExit.toString()))
      assert.equal(kelvinEthBalance.toString(), kelvinExpectedBalance.toString())
    })
  })
})
