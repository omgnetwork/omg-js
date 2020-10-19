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

describe('challengeInFlightExitOutputSpentTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName });
  });

  describe('in-flight transaction challenge with a invalid output piggybacking', function () {
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
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT);

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
        ),
        rcHelper.waitForEthBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
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

    it('should challenge output from a canonical invalid output piggyback', async function () {
      const bobSpentOnGas = new BN(0);
      const carolSpentOnGas = new BN(0);
      const fees = (await omgjs.getFees())['1'];
      const { amount: feeAmountEth } = fees.find(f => f.currency === OmgJS.currency.ETH);
      // Alice sends to Bob
      const tx1 = await ccHelper.createTx(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT + feeAmountEth, // send amount + fee so bob can send exact amount after
        OmgJS.currency.ETH,
        aliceAccount.privateKey
      );
      const tx1Receipt = await omgjs.submitTransaction(tx1);
      await ccHelper.waitNumUtxos(bobAccount.address, 1);
      console.log('Alice sends tx to Bob: ', tx1Receipt.txhash);

      // Bob IFE's tx1 and piggybacks the output
      const exitData = await omgjs.inFlightExitGetData(tx1);
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
      console.log('Bob starts an IFE: ', ifeReceipt.transactionHash);
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt));

      const piggyReceipt = await omgjs.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: 0,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });
      console.log('Bob piggybacks his output: ', piggyReceipt.transactionHash);
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(piggyReceipt));

      // Bob spends his utxo to carol
      const tx2 = await ccHelper.createTx(
        bobAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        bobAccount.privateKey
      );
      const tx2Receipt = await omgjs.submitTransaction(tx2);
      await ccHelper.waitNumUtxos(carolAccount.address, 1);
      console.log('Bob spends his UTXO on Carol: ', tx2Receipt.txhash);

      // Bobs piggybacked output was spent, and needs to be challenged
      // tx2 is sent, but it takes awhile before watcher can get the Challenge data...
      await rcHelper.sleep(30000);
      const challengeData = await omgjs.inFlightExitGetOutputChallengeData({ txbytes: exitData.in_flight_tx, outputIndex: 0 });

      // NMTODO: failing test
      const challengeReceipt = await omgjs.challengeInFlightExitOutputSpent({
        inFlightTx: challengeData.in_flight_txbytes,
        inFlightTxInclusionProof: challengeData.in_flight_proof,
        inFlightTxOutputPos: challengeData.in_flight_output_pos,
        challengingTx: challengeData.spending_txbytes,
        challengingTxInputIndex: challengeData.spending_input_index,
        challengingTxWitness: challengeData.spending_sig,
        txOptions: {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      });
      console.log('Carol challenges IFE output spent: ', challengeReceipt.transactionHash);
      carolSpentOnGas.iadd(await rcHelper.spentOnGas(challengeReceipt));

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      });
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`);
      await rcHelper.sleep(msUntilFinalization);

      const processReceipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 10,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });
      if (processReceipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${processReceipt.transactionHash}`);
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(processReceipt));
        await rcHelper.awaitTx(processReceipt.transactionHash);
      }

      const { bonds } = await omgjs.getPaymentExitGame();
      // Bob's piggyback was challenged, so he shouldnt have gotten his output out
      // Bob RC Balance - Bob gas - Bobs piggyback bond
      const bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address);
      const bobExpected = new BN(INTIIAL_BOB_RC_AMOUNT)
        .sub(bobSpentOnGas)
        .sub(new BN(bonds.piggyback.toString()));
      assert.equal(bobEthBalance.toString(), bobExpected.toString());

      // Carol challenged the piggyback so she should get the piggy back bond
      // Carol RC Balance - Carol gas + Bobs piggyback bond
      const carolsEthBalance = await omgjs.getRootchainETHBalance(carolAccount.address);
      const carolExpected = new BN(INTIIAL_CAROL_RC_AMOUNT)
        .sub(carolSpentOnGas)
        .add(new BN(bonds.piggyback.toString()));
      assert.equal(carolsEthBalance.toString(), carolExpected.toString());
    });
  });
});
