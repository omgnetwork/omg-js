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
import config from '../test-config';

should()
use(chaiAsPromised)

const faucetName = path.basename(__filename)

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('addExitQueueTest.js', function () {
  const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('0.1', 'ether')
  let aliceAccount

  before(async function () {
    await faucet.init({ faucetName })
  })

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

  it('add token should add token if not added before', async function () {
    const fakeErc20 = rcHelper.createAccount()
    const hasToken = await omgjs.hasExitQueue(fakeErc20.address)
    assert.isFalse(hasToken)
    return omgjs.addExitQueue({
      currency: fakeErc20.address,
      txOptions: { from: aliceAccount.address, privateKey: aliceAccount.privateKey }
    }).should.be.fulfilled
  })

  it('add token should not add token if added before', async function () {
    const fakeErc20 = rcHelper.createAccount()
    await omgjs.addExitQueue({
      currency: fakeErc20.address,
      txOptions: { from: aliceAccount.address, privateKey: aliceAccount.privateKey }
    }).should.be.fulfilled
    const hasToken = await omgjs.hasExitQueue(fakeErc20.address)
    assert.isTrue(hasToken)
    return omgjs.addExitQueue({
      currency: fakeErc20.address,
      txOptions: { from: aliceAccount.address, privateKey: aliceAccount.privateKey }
    }).should.be.rejected
  })
})
