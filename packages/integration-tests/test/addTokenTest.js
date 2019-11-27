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

const { assert, should, use } = require('chai')
const chaiAsPromised = require('chai-as-promised')
const RootChain = require('@omisego/omg-js-rootchain')
const ChildChain = require('@omisego/omg-js-childchain')
const Web3 = require('web3')

const faucet = require('../helpers/testFaucet')
const config = require('../test-config')
const rcHelper = require('../helpers/rootChainHelper')

should()
use(chaiAsPromised)

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))

let rootChain
let childChain
let aliceAccount
const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')

describe('AddExitQueue tests', function () {
  before(async function () {
    aliceAccount = rcHelper.createAccount(web3)
    console.log(`Created new account ${JSON.stringify(aliceAccount)}`)
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

    await faucet.init(rootChain, childChain, web3, config)
    await faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
  })

  it('add token should add token if not added before', async function () {
    const fakeErc20 = rcHelper.createAccount(web3)
    const hasToken = await rootChain.hasToken(fakeErc20.address)
    assert.isFalse(hasToken)
    return rootChain.addToken(fakeErc20.address, { from: aliceAccount.address, privateKey: aliceAccount.privateKey }).should.be.fulfilled
  })

  it('add token should not add token if added before', async function () {
    const fakeErc20 = rcHelper.createAccount(web3)
    await rootChain.addToken(fakeErc20.address, { from: aliceAccount.address, privateKey: aliceAccount.privateKey }).should.be.fulfilled
    const hasToken = await rootChain.hasToken(fakeErc20.address)
    assert.isTrue(hasToken)
    return rootChain.addToken(fakeErc20.address, { from: aliceAccount.address, privateKey: aliceAccount.privateKey }).should.be.rejected
  })
})
