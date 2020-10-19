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

describe('mergeUtxoTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('merge utxos', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether')
    const TEST_AMOUNT = Number(web3Utils.toWei('.0001', 'ether'))

    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should merge utxos to a single utxo', async function () {
      // The new account should have no initial balance
      const initialBalance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(initialBalance.length, 0)

      // Deposit ETH into the Plasma contract
      await omgjs.deposit({
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      // Wait for transaction to be mined and reflected in the account's balance
      await ccHelper.waitForBalanceEq(aliceAccount.address, TEST_AMOUNT)

      await omgjs.deposit({
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      await ccHelper.waitForBalanceEq(aliceAccount.address, TEST_AMOUNT * 2)

      // THe account should have one utxo on the child chain
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      await omgjs.mergeUtxos({
        utxos,
        privateKey: aliceAccount.privateKey
      })
      await ccHelper.waitNumUtxos(aliceAccount.address, 1)
      const utxosMerged = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxosMerged.length, 1)
      assert.equal(utxosMerged[0].amount.toString(), (TEST_AMOUNT * 2).toString())
    })
  })
})
