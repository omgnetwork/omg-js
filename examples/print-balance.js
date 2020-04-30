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
const getFlags = require('./parse-args')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })

async function printBalance () {
  try {
    const { owner } = getFlags('owner')
    const address = config[`${owner}_eth_address`]

    const balanceArray = await childChain.getBalance(address)
    const childchainBalance = balanceArray.map(i => {
      return {
        currency: i.currency === transaction.ETH_CURRENCY ? 'ETH' : i.currency,
        amount: i.currency === transaction.ETH_CURRENCY ? `${web3.utils.fromWei(String(i.amount))} ETH` : i.amount
      }
    })
    const rootchainBalance = await web3.eth.getBalance(address)
    const rootchainBalances = [
      {
        currency: 'ETH',
        amount: `${web3.utils.fromWei(String(rootchainBalance), 'ether')} ETH`
      }
    ]

    if (config.erc20_contract_address) {
      const aliceRootchainERC20Balance = await getErc20Balance({
        web3,
        address: address,
        erc20Address: config.erc20_contract_address
      })
      rootchainBalances.push({
        currency: config.erc20_contract_address,
        amount: aliceRootchainERC20Balance
      })
    }

    console.log(`Rootchain balance: ${JSON.stringify(rootchainBalances, null, 2)}`)
    console.log(`Childchain balance: ${JSON.stringify(childchainBalance, null, 2)}`)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

printBalance()
