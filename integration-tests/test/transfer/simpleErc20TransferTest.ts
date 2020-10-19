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

describe('simpleErc20TransferTest.js', function () {
  let feeEth;

  before(async function () {
    await faucet.init({ faucetName });
    const fees = (await omgjs.getFees())['1'];
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH);
    feeEth = amount;
  });

  describe('ERC20 transfer', function () {
    const ERC20_CURRENCY = config.erc20_contract_address;
    const INTIIAL_ALICE_AMOUNT_ETH = web3Utils.toWei('.0001', 'ether');
    const INTIIAL_ALICE_AMOUNT = 4;
    const TRANSFER_AMOUNT = 3;

    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();

      // Give some ETH to Alice on the childchain to pay fees
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH);
      // Give some ERC20 to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY);
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should transfer ERC20 tokens on the childchain', async function () {
      // Check utxos on the child chain
      const utxos = await omgjs.getUtxos(aliceAccount.address);
      assert.equal(utxos.length, 2);

      const erc20Utxo = utxos.find(utxo => utxo.currency === ERC20_CURRENCY);
      const ethUtxo = utxos.find(utxo => utxo.currency === OmgJS.currency.ETH);
      assert.equal(erc20Utxo.amount, INTIIAL_ALICE_AMOUNT);
      assert.equal(erc20Utxo.currency, ERC20_CURRENCY);

      const CHANGE_AMOUNT = erc20Utxo.amount - TRANSFER_AMOUNT;
      const CHANGE_AMOUNT_FEE = ethUtxo.amount - feeEth;
      const txBody = {
        inputs: [ethUtxo, erc20Utxo],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: ERC20_CURRENCY,
          amount: Number(TRANSFER_AMOUNT)
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: ERC20_CURRENCY,
          amount: CHANGE_AMOUNT
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: OmgJS.currency.ETH,
          amount: CHANGE_AMOUNT_FEE
        }]
      };

      const typedData = omgjs.getTypedData(txBody);
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [aliceAccount.privateKey, aliceAccount.privateKey] });
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures });
      const result = await omgjs.submitTransaction(signedTx);
      console.log(`Submitted transaction: ${result.txhash}`);

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT, ERC20_CURRENCY);
      assert.equal(balance.length, 1);
      assert.equal(balance[0].amount, TRANSFER_AMOUNT);

      // Alice's balance should be CHANGE_AMOUNT
      balance = await omgjs.getBalance(aliceAccount.address);
      const erc20Balance = balance.filter(b => b.currency === ERC20_CURRENCY);
      assert.equal(erc20Balance[0].amount, CHANGE_AMOUNT);
    });
  });
});
