/*
Copyright 2020 OmiseGO Pte Ltd

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

const faucetName = path.basename(__filename);

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('inFlightExitChallengeTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName });
  });

  describe('in-flight transaction challenge exit with competitor', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.001', 'ether');
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.5', 'ether');
    const INTIIAL_CAROL_RC_AMOUNT = web3Utils.toWei('.1', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('0.0002', 'ether');

    let aliceAccount;
    let bobAccount;
    let carolAccount;
    let fundAliceTx;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();
      carolAccount = rcHelper.createAccount();

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          OmgJS.currency.ETH
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx));

      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(carolAccount.address, INTIIAL_CAROL_RC_AMOUNT);

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          carolAccount.address,
          INTIIAL_CAROL_RC_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          bobAccount.address,
          INTIIAL_BOB_RC_AMOUNT
        )
      ]);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
        await faucet.returnFunds(carolAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should challenge an in-flight exit by providing a competitor', async function () {
      const bobSpentOnGas = new BN(0);
      // Alice creates a transaction to send funds to Bob
      const bobTx = await ccHelper.createTx(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey
      );

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await omgjs.inFlightExitGetData(bobTx);
      assert.containsAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ]);

      // Starts the in-flight exit
      const bobEthBalanceBeforeIfe = await omgjs.getRootchainETHBalance(
        bobAccount.address
      );
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
      });
      const bobEthBalanceAfterIfe = await omgjs.getRootchainETHBalance(
        bobAccount.address
      );
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`
      );
      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt));

      const { bonds } = await omgjs.getPaymentExitGame();
      assert.equal(
        web3Utils
          .toBN(bobEthBalanceBeforeIfe)
          .sub(web3Utils.toBN(bobEthBalanceAfterIfe))
          .sub(bobSpentOnGas)
          .toString(),
        web3Utils.toBN(bonds.inflightExit).toString()
      );

      // Decode the transaction to get the index of Bob's output
      const decodedTx = omgjs.decodeTransaction(bobTx);
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      );

      // Bob piggybacks his output on the in-flight exit
      let receipt = await omgjs.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      );
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt));

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction _does_ get put into a block.
      const carolTx = await ccHelper.sendAndWait(
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      );

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = omgjs.decodeTransaction(carolTx.txbytes);
      const cInput = carolTxDecoded.inputs[0];
      const inflightExit = await ccHelper.waitForEvent(
        'in_flight_exits',
        e => {
          const decoded = omgjs.decodeTransaction(e.txbytes);
          return decoded.inputs.find(
            input =>
              input.blknum === cInput.blknum &&
              input.txindex === cInput.txindex &&
              input.oindex === cInput.oindex
          );
        }
      );

      // Carol gets the competitor of Bob's exit
      const competitor = await omgjs.inFlightExitGetCompetitor(
        inflightExit.txbytes
      );
      console.log('Got competitor');

      assert.containsAllKeys(competitor, [
        'in_flight_txbytes',
        'in_flight_input_index',
        'competing_txbytes',
        'competing_input_index',
        'competing_tx_pos',
        'competing_proof',
        'competing_sig',
        'input_tx',
        'input_utxo_pos'
      ]);
      // Challenge the IFE as non canonical
      receipt = await omgjs.challengeInFlightExitNotCanonical({
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
      });
      // Keep track of how much Carol spends on gas
      const carolSpentOnGas = await rcHelper.spentOnGas(receipt);
      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      });
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`);
      await rcHelper.sleep(msUntilFinalization);

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });
      if (receipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`);
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt));
        await rcHelper.awaitTx(receipt.transactionHash);
      }

      // Get Bob's ETH balance
      const bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address);
      // Bob's IFE was not successful, so he loses his exit bond, but gets his piggyback bond back
      // INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3Utils.toBN(bonds.inflightExit))
        .sub(bobSpentOnGas);
      assert.equal(bobEthBalance.toString(), expected.toString());

      // Get carol's ETH balance
      const carolEthBalance = await omgjs.getRootchainETHBalance(carolAccount.address);
      // carol got Bob's exit bond, so expect her balance to be
      // INTIIAL_CAROL_AMOUNT + INFLIGHT_EXIT_BOND - gas spent
      const carolExpected = web3Utils
        .toBN(INTIIAL_CAROL_RC_AMOUNT)
        .add(web3Utils.toBN(bonds.inflightExit))
        .sub(carolSpentOnGas);
      assert.equal(carolEthBalance.toString(), carolExpected.toString());
    });
  });

  describe('in-flight transaction challenge exit without competitor', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether');
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.5', 'ether');
    const INTIIAL_CAROL_RC_AMOUNT = web3Utils.toWei('.5', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('0.0002', 'ether');

    let aliceAccount;
    let bobAccount;
    let carolAccount;
    let fundAliceTx;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();
      carolAccount = rcHelper.createAccount();

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          OmgJS.currency.ETH
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx));
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(carolAccount.address, INTIIAL_CAROL_RC_AMOUNT);

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          carolAccount.address,
          INTIIAL_CAROL_RC_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          bobAccount.address,
          INTIIAL_BOB_RC_AMOUNT
        )
      ]);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
        await faucet.returnFunds(carolAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should challenge an in-flight exit as non canonical', async function () {
      // Alice creates a transaction to send funds to Bob
      const bobSpentOnGas = new BN(0);
      const bobTx = await ccHelper.createTx(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey
      );

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await omgjs.inFlightExitGetData(bobTx);
      assert.containsAllKeys(exitData, [
        'in_flight_tx',
        'in_flight_tx_sigs',
        'input_txs',
        'input_txs_inclusion_proofs',
        'input_utxos_pos'
      ]);

      // Starts the in-flight exit
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
      });
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`
      );

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt));

      // Decode the transaction to get the index of Bob's output
      const decodedTx = omgjs.decodeTransaction(bobTx);
      const outputIndex = decodedTx.outputs.findIndex(
        e => e.outputGuard === bobAccount.address
      );

      // Bob piggybacks his output on the in-flight exit
      let receipt = await omgjs.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: outputIndex,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });

      console.log(
        `Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`
      );
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt));

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction doesn't get put into a block either.
      const carolTx = await ccHelper.createTx(
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey
      );

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = omgjs.decodeTransaction(carolTx);
      const cInput = carolTxDecoded.inputs[0];
      const inflightExit = await ccHelper.waitForEvent(
        'in_flight_exits',
        e => {
          const decoded = omgjs.decodeTransaction(e.txbytes);
          return decoded.inputs.find(
            input =>
              input.blknum === cInput.blknum &&
              input.txindex === cInput.txindex &&
              input.oindex === cInput.oindex
          );
        }
      );

      // Carol's tx was not put into a block, but it can still be used to challenge Bob's IFE as non-canonical
      const utxoPosOutput = omgjs.encodeUtxoPos({
        blknum: fundAliceTx.result.blknum,
        txindex: fundAliceTx.result.txindex,
        oindex: 0
      }).toNumber();

      const unsignInput = omgjs.encodeTransaction({ ...omgjs.decodeTransaction(fundAliceTx.txbytes), signed: false });
      const unsignCarolTx = omgjs.encodeTransaction({ ...carolTxDecoded, signed: false });
      receipt = await omgjs.challengeInFlightExitNotCanonical({
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
      });
      // Keep track of how much Carol spends on gas
      const carolSpentOnGas = await rcHelper.spentOnGas(receipt);

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      });
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`);
      await rcHelper.sleep(msUntilFinalization);

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });
      if (receipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`);
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(receipt));
        await rcHelper.awaitTx(receipt.transactionHash);
      }

      const { bonds } = await omgjs.getPaymentExitGame();
      // Get Bob's ETH balance
      const bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address);
      // Bob's IFE was not successful, so he loses his exit bond, but gets back his piggyback bond.
      // INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3Utils.toBN(bonds.inflightExit))
        .sub(bobSpentOnGas);
      assert.equal(bobEthBalance.toString(), expected.toString());

      // Get carol's ETH balance
      const carolEthBalance = await omgjs.getRootchainETHBalance(carolAccount.address);
      // carol got Bob's exit bond, so expect her balance to be
      // INTIIAL_CAROL_AMOUNT + INFLIGHT_EXIT_BOND - gas spent
      const carolExpected = web3Utils
        .toBN(INTIIAL_CAROL_RC_AMOUNT)
        .add(web3Utils.toBN(bonds.inflightExit))
        .sub(carolSpentOnGas);
      assert.equal(carolEthBalance.toString(), carolExpected.toString());
    });
  });
});
