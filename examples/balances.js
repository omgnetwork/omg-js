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
  limitations under the License.
*/
const Web3 = require('web3')
const config = require('./config.js')
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction, getErc20Balance } = require('../packages/omg-js-util/src')

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

async function balances () {
  const alicesBalanceArray = await childChain.getBalance(config.alice_eth_address)
  const aliceChildchainBalance = alicesBalanceArray.map(i => {
    return {
      currency: i.currency === transaction.ETH_CURRENCY ? 'ETH' : i.currency,
      amount: i.currency === transaction.ETH_CURRENCY ? `${web3.utils.fromWei(String(i.amount))} ETH` : i.amount
    }
  })
  const aliceRootchainBalance = await web3.eth.getBalance(config.alice_eth_address)
  const aliceRootchainBalances = [
    {
      currency: 'ETH',
      amount: `${web3.utils.fromWei(String(aliceRootchainBalance), 'ether')} ETH`
    }
  ]

  if (config.erc20_contract) {
    const aliceRootchainERC20Balance = await getErc20Balance({
      web3,
      address: config.alice_eth_address,
      erc20Address: config.erc20_contract
    })
    aliceRootchainBalances.push({
      currency: config.erc20_contract,
      amount: aliceRootchainERC20Balance
    })
  }

  const bobsBalanceArray = await childChain.getBalance(config.bob_eth_address)
  const bobChildchainBalance = bobsBalanceArray.map(i => {
    return {
      currency: i.currency === transaction.ETH_CURRENCY ? 'ETH' : i.currency,
      amount: i.currency === transaction.ETH_CURRENCY ? `${web3.utils.fromWei(String(i.amount))} ETH` : i.amount
    }
  })

  const bobRootchainBalance = await web3.eth.getBalance(config.bob_eth_address)
  const bobRootchainBalances = [
    {
      currency: 'ETH',
      amount: `${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`
    }
  ]

  if (config.erc20_contract) {
    const bobRootchainERC20Balance = await getErc20Balance({
      web3,
      address: config.bob_eth_address,
      erc20Address: config.erc20_contract
    })
    bobRootchainBalances.push({
      currency: config.erc20_contract,
      amount: bobRootchainERC20Balance
    })
  }

  console.log(`Alice's rootchain balance: ${JSON.stringify(aliceRootchainBalances, null, 2)}`)
  console.log(`Alice's childchain balance: ${JSON.stringify(aliceChildchainBalance, null, 2)}`)
  console.log('----------')
  console.log(`Bob's rootchain balance: ${JSON.stringify(bobRootchainBalances, null, 2)}`)
  console.log(`Bob's childchain balance: ${JSON.stringify(bobChildchainBalance, null, 2)}`)
}

balances()
