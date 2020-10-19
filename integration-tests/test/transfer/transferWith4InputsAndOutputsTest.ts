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

import OmgJS from '../../..';

import faucet from '../../helpers/faucet';
import * as rcHelper from '../../helpers/rootChainHelper';
import * as ccHelper from '../../helpers/childChainHelper';
import config from '../../test-config';

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

describe('transferTest.js', function () {
  let feeEth;

  before(async function () {
    await faucet.init({ faucetName });
    const fees = (await omgjs.getFees())['1'];
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH);
    feeEth = amount;
  });

  describe('Transfer with 4 inputs and 4 outputs', function () {
    const UTXO_AMOUNT = web3Utils.toWei('.0001', 'ether');
    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();

      // Alice and Bob want 2 utxos each
      await faucet.fundChildchain(aliceAccount.address, UTXO_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, UTXO_AMOUNT);
      await faucet.fundChildchain(bobAccount.address, UTXO_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(bobAccount.address, UTXO_AMOUNT);

      await faucet.fundChildchain(aliceAccount.address, UTXO_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, Number(UTXO_AMOUNT) * 2);
      await faucet.fundChildchain(bobAccount.address, UTXO_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(bobAccount.address, Number(UTXO_AMOUNT) * 2);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should send a transaction with 4 inputs and 4 outputs', async function () {
      // Check Alice's utxos on the child chain
      let aliceUtxos = await omgjs.getUtxos(aliceAccount.address);
      assert.equal(aliceUtxos.length, 2);
      assert.equal(aliceUtxos[0].amount.toString(), UTXO_AMOUNT);
      assert.equal(aliceUtxos[0].currency, OmgJS.currency.ETH);
      assert.equal(aliceUtxos[1].amount.toString(), UTXO_AMOUNT);
      assert.equal(aliceUtxos[1].currency, OmgJS.currency.ETH);

      // Check Bob's utxos on the child chain
      let bobUtxos = await omgjs.getUtxos(bobAccount.address);
      assert.equal(bobUtxos.length, 2);
      assert.equal(bobUtxos[0].amount.toString(), UTXO_AMOUNT);
      assert.equal(bobUtxos[0].currency, OmgJS.currency.ETH);
      assert.equal(bobUtxos[1].amount.toString(), UTXO_AMOUNT);
      assert.equal(bobUtxos[1].currency, OmgJS.currency.ETH);

      // Construct the transaction body using all 4 deposit utxos
      const inputs = [aliceUtxos[0], aliceUtxos[1], bobUtxos[0], bobUtxos[1]];

      // Split the transaction into 4 different outputs:
      const ALICE_OUTPUT_0 = Number(UTXO_AMOUNT) * 0.2;
      const ALICE_OUTPUT_1 = Number(UTXO_AMOUNT) * 1.3;
      const BOB_OUTPUT_0 = Number(UTXO_AMOUNT) * 1;
      const BOB_OUTPUT_1 = new BN(UTXO_AMOUNT).mul(new BN(3)).div(new BN(2)).sub(new BN(feeEth));
      const outputs = [
        {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: OmgJS.currency.ETH,
          amount: ALICE_OUTPUT_0
        },
        {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: OmgJS.currency.ETH,
          amount: ALICE_OUTPUT_1
        },
        {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: BOB_OUTPUT_0
        },
        {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: BOB_OUTPUT_1
        }
      ];

      // Get the transaction data
      const typedData = omgjs.getTypedData({ inputs, outputs });
      // Sign it with the correct private key for each input
      const signatures = omgjs.signTransaction({ typedData,
        privateKeys: [
          aliceAccount.privateKey,
          aliceAccount.privateKey,
          bobAccount.privateKey,
          bobAccount.privateKey
        ]
      });
      assert.equal(signatures.length, 4);
      // Build the signed transaction
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures });

      // Submit the signed transaction to the childchain
      const result = await omgjs.submitTransaction(signedTx);
      console.log(`Submitted transaction: ${result.txhash}`);

      // Alice's balance should be ALICE_OUTPUT_0 + ALICE_OUTPUT_1
      const expected = web3Utils.toBN(ALICE_OUTPUT_0).add(web3Utils.toBN(ALICE_OUTPUT_1));
      const balance = await ccHelper.waitForBalanceEq(aliceAccount.address, expected.toString());
      assert.equal(balance[0].amount.toString(), expected.toString());

      // Check Alice's utxos on the child chain again
      aliceUtxos = await omgjs.getUtxos(aliceAccount.address);
      assert.equal(aliceUtxos.length, 2);
      assert.equal(aliceUtxos[0].amount.toString(), ALICE_OUTPUT_0.toString());
      assert.equal(aliceUtxos[0].currency, OmgJS.currency.ETH);
      assert.equal(aliceUtxos[1].amount.toString(), ALICE_OUTPUT_1.toString());
      assert.equal(aliceUtxos[1].currency, OmgJS.currency.ETH);

      // Check Bob's utxos on the child chain again
      bobUtxos = await omgjs.getUtxos(bobAccount.address);
      assert.equal(bobUtxos.length, 2);
      assert.equal(bobUtxos[0].amount.toString(), BOB_OUTPUT_0.toString());
      assert.equal(bobUtxos[0].currency, OmgJS.currency.ETH);
      assert.equal(bobUtxos[1].amount.toString(), BOB_OUTPUT_1.toString());
      assert.equal(bobUtxos[1].currency, OmgJS.currency.ETH);
    });
  });
});
