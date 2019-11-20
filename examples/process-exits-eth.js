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

const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, {
  transactionConfirmationBlocks: 1
})

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

async function processExits () {
  const bobRootchainBalance = await web3.eth.getBalance(bobAddress)
  console.log(`Bob's rootchain balance: ${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`)
  console.log('-----')

  const processExitsPostChallengeReceipt = await rootChain.processExits(
    transaction.ETH_CURRENCY, 0, 20,
    {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  )
  if (processExitsPostChallengeReceipt) {
    await wait.waitForTransaction(
      web3,
      processExitsPostChallengeReceipt.transactionHash,
      config.millis_to_wait_for_next_block,
      config.blocks_to_wait_for_txn
    )
    console.log('Exits processed')
  }
  return Promise.resolve()
}

(async () => {
  try {
    const result = await processExits()
    return Promise.resolve(result)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
})()
