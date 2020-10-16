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

const faucetName = path.basename(__filename);

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('createSubmitTypedTransactionTest.js', function () {
  let FEE_ETH_AMOUNT

  before(async function () {
    await faucet.init({ faucetName })
    const fees = (await omgjs.getFees())['1']
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH)
    FEE_ETH_AMOUNT = new BN(amount.toString())
  })

  describe('create a single currency transaction with submitTyped', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether')
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether')

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create and submit a single currency transaction using submitTyped', async function () {
      const createdTx = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: Number(TRANSFER_AMOUNT)
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      const txTypedData = omgjs.signTypedData({ txData: createdTx.transactions[0], privateKeys: [aliceAccount.privateKey] })
      const result = await omgjs.submitTypedData(txTypedData)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be INTIIAL_ALICE_AMOUNT - TRANSFER_AMOUNT - FEE_AMOUNT
      const aliceBalance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 1)
      const expected = new BN(INTIIAL_ALICE_AMOUNT).sub(new BN(TRANSFER_AMOUNT)).sub(FEE_ETH_AMOUNT)
      assert.equal(aliceBalance[0].amount.toString(), expected.toString())
    })
  })
})
