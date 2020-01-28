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
const fs = require('fs')

const faucet = require('./helpers/faucet')
const config = require('./test-config')

const MochaParallel = require('mocha-parallel-tests').default
const mochaParallel = new MochaParallel({
  enableTimeouts: false,
  slow: 0,
  useColors: true,
  fullStackTrace: true,
  reporter: 'list'
})

const allFiles = fs.readdirSync(`${__dirname}/test/`)
const files = allFiles.filter(i => {
  // skipped since testing exit queues is impossible with parallel tests calling processExits
  return i !== 'getExitQueueTest.js'
})

for (const test of files) {
  mochaParallel.addFile(`${__dirname}/test/${test}`)
}

async function setup () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchainContract })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  const start = new Date()
  for (const filename of files) {
    await faucet.init(rootChain, childChain, web3, config, filename)
    console.log(`💰 Test faucet funded for ${filename}`)
    console.log('\n')
  }
  const end = new Date()
  console.log(`⏳ Total funding time: ${(end - start) / 60000} min`)
}

setup().then(() => {
  console.log(`🚀 Running ${files.length} tests in parallel...`)
  mochaParallel.run()
})
