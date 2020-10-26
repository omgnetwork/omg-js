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

describe('challengeExitTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName });
  });

  describe('Challenge a standard exit', function () {
    const INTIIAL_ALICE_RC_AMOUNT = web3Utils.toWei('.1', 'ether');
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.1', 'ether');
    const INTIIAL_ALICE_CC_AMOUNT = web3Utils.toWei('.001', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('0.0002', 'ether');

    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();

      await Promise.all([
        faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_CC_AMOUNT, OmgJS.currency.ETH),
        faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_RC_AMOUNT)
      ]);
      await faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT);

      await Promise.all([
        ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_CC_AMOUNT),
        rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_RC_AMOUNT),
        rcHelper.waitForEthBalanceEq(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should succesfully challenge a dishonest exit', async function () {
      // Send TRANSFER_AMOUNT from Alice to Bob
      await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      );

      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`);

      // Save Alice's latest utxo
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address);
      const aliceDishonestUtxo = aliceUtxos[0];

      // Send another TRANSFER_AMOUNT from Alice to Bob
      await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        Number(TRANSFER_AMOUNT) * 2
      );
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`);

      // Now Alice wants to cheat and exit with the dishonest utxo

      const exitData = await omgjs.getExitData(aliceDishonestUtxo);
      const standardExitReceipt = await omgjs.startStandardExit({
        utxoPos: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      });
      console.log(`Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`);
      const aliceSpentOnGas = await rcHelper.spentOnGas(standardExitReceipt);

      // Bob calls watcher/status.get and sees the invalid exit attempt...
      const invalidExitUtxoPos = omgjs.encodeUtxoPos(aliceDishonestUtxo);
      const invalidExit = await ccHelper.waitForEvent(
        'byzantine_events',
        e => e.event === 'invalid_exit' && e.details.utxo_pos.toString() === invalidExitUtxoPos.toString()
      );

      // ...and challenges the exit
      const challengeData = await omgjs.getChallengeData(invalidExit.details.utxo_pos);
      assert.containsAllKeys(challengeData, ['input_index', 'exit_id', 'exiting_tx', 'sig', 'txbytes']);

      let receipt = await omgjs.challengeStandardExit({
        standardExitId: challengeData.exit_id,
        exitingTx: challengeData.exiting_tx,
        challengeTx: challengeData.txbytes,
        inputIndex: challengeData.input_index,
        challengeTxSig: challengeData.sig,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      });
      console.log(`Bob called RootChain.challengeExit(): txhash = ${receipt.transactionHash}`);

      // Keep track of how much Bob spends on gas
      const bobSpentOnGas = await rcHelper.spentOnGas(receipt);

      // Alice waits for the challenge period to be over...
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: aliceDishonestUtxo.blknum
      });
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`);
      await rcHelper.sleep(msUntilFinalization);

      // ...and calls finalize exits.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      });
      if (receipt) {
        console.log(`Alice called RootChain.processExits(): txhash = ${receipt.transactionHash}`);
        aliceSpentOnGas.iadd(await rcHelper.spentOnGas(receipt));
        await rcHelper.awaitTx(receipt.transactionHash);
      }

      // Get Alice's ETH balance
      const aliceEthBalance = await omgjs.getRootchainETHBalance(aliceAccount.address);
      // Alice's dishonest exit did not successfully complete, so her balance should be
      // INTIIAL_ALICE_RC_AMOUNT - STANDARD_EXIT_BOND - gas spent
      const { bonds } = await omgjs.getPaymentExitGame();
      const expected = new BN(INTIIAL_ALICE_RC_AMOUNT)
        .sub(new BN(bonds.standardExit.toString()))
        .sub(aliceSpentOnGas);
      assert.equal(aliceEthBalance.toString(), expected.toString());

      // Bob successfully challenged the exit, so he should have received the exit bond
      const bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address);
      const bobExpectedBalance = new BN(INTIIAL_BOB_RC_AMOUNT)
        .add(new BN(bonds.standardExit.toString()))
        .sub(bobSpentOnGas);
      assert.equal(bobEthBalance.toString(), bobExpectedBalance.toString());
    });
  });
});
