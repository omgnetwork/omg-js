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

const RootChain = require('@omisego/omg-js-rootchain')
const ChildChain = require('@omisego/omg-js-childchain')
const Web3 = require('web3')

const faucet = require('./helpers/testFaucet')
const config = require('./test-config')

const MochaParallel = require('mocha-parallel-tests').default
const mochaParallel = new MochaParallel({
  enableTimeouts: false,
  slow: 0,
  useColors: true,
  fullStackTrace: true,
  reporter: 'list'
})

const testFiles = [
  'CORSHeaderTest',
  'metadataTest',
  'decodeTxBytesTest',
  'addTokenTest'
  // 'depositTest',
  // 'createTransactionTest',
  // 'transferTest',
  // 'createSubmitTypedTransactionTest',
  // 'getExitQueueTest',
  // 'standardExitTest',
  // 'challengeExitTest',
  // 'inFlightExitTest',
  // 'inFlightExitChallengeTest',
  // 'inFlightExitChallengeResponseTest',
  // 'challengeInFlightExitInputSpentTest',
  // 'challengeInFlightExitOutputSpentTest'
]

for (const test of testFiles) {
  mochaParallel.addFile(`${__dirname}/test/${test}.js`)
}

async function setup () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchainContract })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  await faucet.init(rootChain, childChain, web3, config)

  // fund individual test faucets
  for (const filename of testFiles) {
    const account = faucet.filenameToAccount(web3, filename)
    await faucet.initEthBalance(web3, web3.utils.toWei('0.1', 'ether'), account.address, account.privateKey)
    await faucet.initERC20Balance(web3, 5, account.address, account.privateKey)
    console.log('-------------------------------------')
    console.log(`Test faucet funded for ${filename}.js`)
    console.log('-------------------------------------')
  }
}

setup().then(() => {
  console.log('setup complete... running parallel tests...')
  // mochaParallel.run()
})

// Each test gets a deterministic faucet that’s pre funded on setup.
// Setup checks if enough eth to run a single test, if not funds, so can be used between tests.
// Alice accounts can then be generate on the fly
// and funded by their own faucet so we don’t have nonce errors from doing multiple transactions from the same account.
