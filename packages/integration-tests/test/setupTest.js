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

const chai = require('chai')
const assert = chai.assert

const RootChain = require('@omisego/omg-js-rootchain')
const ChildChain = require('@omisego/omg-js-childchain')
const Web3 = require('web3')

const faucet = require('../helpers/testFaucet')
const config = require('../test-config')

describe('setupTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchainContract })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  before(async function () {
    await faucet.init(rootChain, childChain, web3, config)
  })

  it('test setup complete', function () {
    assert.isTrue(true)
  })
})
