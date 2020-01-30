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

// Use this script to return any funds in faucet accounts back to the fund account

const RootChain = require('@omisego/omg-js-rootchain')
const ChildChain = require('@omisego/omg-js-childchain')
const Web3 = require('web3')
const fs = require('fs')

const faucet = require('./helpers/faucet')
const config = require('./test-config')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

async function cleanup () {
  console.log(`🧹 Returning faucet funds back to the fund account: ${config.fund_account}`)
  const allFiles = fs.readdirSync(`${__dirname}/test/`)
  const fundingPromises = []

  for (const faucetName of allFiles) {
    await faucet.init({ rootChain, childChain, web3, config, faucetName, topup: false })
    fundingPromises.push(
      faucet.returnFunds(faucet.faucetAccount, faucet.fundAccount)
    )
  }

  await Promise.all(fundingPromises)
  console.log(`🧹 All faucet funds returned to fund account: ${config.fund_account}`)
}

cleanup()
