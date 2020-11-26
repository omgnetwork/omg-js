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

describe('getExitQueueTest.js', function () {
  const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether');
  const DEPOSIT_AMOUNT = web3Utils.toWei('.0001', 'ether');
  let aliceAccount;

  before(async function () {
    await faucet.init({ faucetName });
  });

  beforeEach(async function () {
    aliceAccount = rcHelper.createAccount();
    await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
    await rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
  });

  afterEach(async function () {
    try {
      await faucet.returnFunds(aliceAccount);
    } catch (err) {
      console.warn(`Error trying to return funds to the faucet: ${err}`);
    }
  });

  it('should be able to retrieve an ETH exit queue', async function () {
    let queue = await omgjs.getExitQueue(OmgJS.currency.ETH);
    if (queue.length) {
      const ethExitReceipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: queue.length,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      });
      if (ethExitReceipt) {
        console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`);
        await rcHelper.awaitTx(ethExitReceipt.transactionHash);
      }
    }
    queue = await omgjs.getExitQueue(OmgJS.currency.ETH);
    assert.lengthOf(queue, 0);

    await omgjs.deposit({
      amount: DEPOSIT_AMOUNT,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    await ccHelper.waitForBalanceEq(aliceAccount.address, DEPOSIT_AMOUNT);
    console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`);

    // Get Alice's deposit utxo
    const aliceUtxos = await omgjs.getUtxos(aliceAccount.address);
    assert.equal(aliceUtxos.length, 1);
    assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT);

    // Get the exit data
    const utxoToExit = aliceUtxos[0];
    const exitData = await omgjs.getExitData(utxoToExit);
    assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos']);

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

    queue = await omgjs.getExitQueue(OmgJS.currency.ETH);
    assert.lengthOf(queue, 1);

    // Check that Alices exitid does indeed show up in the queue
    const alicesExitId = await omgjs.getStandardExitId({
      txBytes: exitData.txbytes,
      utxoPos: exitData.utxo_pos,
      isDeposit: true
    });
    const { exitId, exitableAt } = queue[0];
    assert.equal(exitId, alicesExitId);

    const { msUntilFinalization, scheduledFinalizationTime } = await omgjs.getExitTime({
      exitRequestBlockNumber: standardExitReceipt.blockNumber,
      submissionBlockNumber: utxoToExit.blknum
    });

    const differenceInFinalizationTime = Math.abs(scheduledFinalizationTime - Number(exitableAt));
    // scheduledFinalizationTime adds a 5 second buffer so this tests that the calculation is consistent
    assert.isAtMost(differenceInFinalizationTime, 6);

    // Wait for challenge period
    console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`);
    await rcHelper.sleep(msUntilFinalization);
    const processReceipt = await omgjs.processExits({
      currency: OmgJS.currency.ETH,
      exitId: 0,
      maxExitsToProcess: queue.length,
      txOptions: {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    });
    console.log(
      `Alice called RootChain.processExits() after challenge period: txhash = ${processReceipt.transactionHash}`
    );

    queue = await omgjs.getExitQueue(OmgJS.currency.ETH);
    assert.lengthOf(queue, 0);
  });
});
