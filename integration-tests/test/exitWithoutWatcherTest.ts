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

describe('exitWithoutWatcherTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('exiting a deposit without a watcher', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether')
    const TEST_AMOUNT = web3Utils.toWei('.0001', 'ether')

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

    it('getDepositExitData creates required exit data', async function () {
      const depositTransaction = await omgjs.deposit({
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      // wait for deposit to be recognized
      await ccHelper.waitNumUtxos(aliceAccount.address, 1)
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address)
      assert.lengthOf(aliceUtxos, 1)
      console.log(`Alice deposited ${TEST_AMOUNT} wei into the RootChain contract`)

      // call the function we are testing
      const exitData = await omgjs.getDepositExitData(depositTransaction.transactionHash)

      // compare it to what the childchain returns
      const ccExitData = await omgjs.getExitData(aliceUtxos[0])

      assert.deepEqual(ccExitData, exitData)
      console.log('Exit data matches what the childchain would return')
    })
  })
})
