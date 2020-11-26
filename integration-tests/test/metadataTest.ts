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
import { keccak256 } from 'ethereumjs-util';

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

describe('metadataTest.js', function () {
  let feeEth;

  before(async function () {
    await faucet.init({ faucetName });
    const fees = (await omgjs.getFees())['1'];
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH);
    feeEth = amount;
  });

  describe('String as metadata', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether');

    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should add metadata to a transaction', async function () {
      const METADATA = 'Hello สวัสดี';

      const utxos = await omgjs.getUtxos(aliceAccount.address);
      const transactionBody = await omgjs.createTransactionBody({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: TRANSFER_AMOUNT
        }],
        fee: {
          amount: feeEth,
          currency: OmgJS.currency.ETH
        },
        metadata: METADATA
      });

      const typedData = omgjs.getTypedData(transactionBody);
      const privateKeys = new Array(transactionBody.inputs.length).fill(aliceAccount.privateKey);
      const signatures = omgjs.signTransaction({ typedData, privateKeys });
      const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
      const result = await omgjs.submitTransaction(signedTxn);
      console.log(`Submitted transaction: ${result.txhash}`);

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT);
      assert.equal(balance.length, 1);
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT);

      const tx = await omgjs.getTransaction(result.txhash);
      const decoded = omgjs.decodeMetadata(tx.metadata);
      assert.equal(decoded, METADATA);
    });
  });

  describe('sha256 as metadata', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether');
    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should add 32 byte hash metadata to a transaction', async function () {
      const METADATA = 'Hello สวัสดี';
      const hash = keccak256(METADATA);
      const hashString = `0x${hash.toString('hex')}`;

      const utxos = await omgjs.getUtxos(aliceAccount.address);
      const transactionBody = await omgjs.createTransactionBody({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        payments: [{
          owner: bobAccount.address,
          amount: TRANSFER_AMOUNT,
          currency: OmgJS.currency.ETH
        }],
        fee: {
          amount: feeEth,
          currency: OmgJS.currency.ETH
        },
        metadata: hashString
      });
      const typedData = omgjs.getTypedData(transactionBody);
      const privateKeys = new Array(transactionBody.inputs.length).fill(aliceAccount.privateKey);
      const signatures = omgjs.signTransaction({ typedData, privateKeys });
      const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
      const result = await omgjs.submitTransaction(signedTxn);
      console.log(`Submitted transaction: ${result.txhash}`);

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT);
      assert.equal(balance.length, 1);
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT);

      const tx = await omgjs.getTransaction(result.txhash);
      assert.equal(tx.metadata, hashString);
    });
  });

  describe('No metadata', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether');
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether');
    let aliceAccount;
    let bobAccount;

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount();
      bobAccount = rcHelper.createAccount();
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH);
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
    });

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount);
        await faucet.returnFunds(bobAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should send a transaction with NO metadata', async function () {
      const utxos = await omgjs.getUtxos(aliceAccount.address);
      const transactionBody = await omgjs.createTransactionBody({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        payments: [{
          owner: bobAccount.address,
          amount: TRANSFER_AMOUNT,
          currency: OmgJS.currency.ETH
        }],
        fee: {
          amount: feeEth,
          currency: OmgJS.currency.ETH
        }
      });
      const typedData = omgjs.getTypedData(transactionBody);
      const privateKeys = new Array(transactionBody.inputs.length).fill(aliceAccount.privateKey);
      const signatures = omgjs.signTransaction({ typedData, privateKeys });
      const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
      const result = await omgjs.submitTransaction(signedTxn);
      console.log(`Submitted transaction: ${result.txhash}`);

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT);
      assert.equal(balance.length, 1);
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT);

      const tx = await omgjs.getTransaction(result.txhash);
      assert.equal(tx.metadata, '0x0000000000000000000000000000000000000000000000000000000000000000');
    });
  });
});
