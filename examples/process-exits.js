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
const { transaction, waitForRootchainTransaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')

// setup for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, {
  transactionConfirmationBlocks: 1
})

const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

async function processExits () {
  const bobRootchainBalance = await web3.eth.getBalance(bobAddress)
  console.log(`Bob's rootchain balance: ${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`)
  console.log('-----')

  const ethQueue = await rootChain.getExitQueue()
  if (ethQueue.length) {
    console.log('Current ETH exit queue: ', ethQueue)
    const ethExitReceipt = await rootChain.processExits({
      token: transaction.ETH_CURRENCY,
      exitId: 0,
      maxExitsToProcess: ethQueue.length,
      txOptions: {
        privateKey: bobPrivateKey,
        from: bobAddress,
        gas: 6000000
      }
    })
    if (ethExitReceipt) {
      console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`)
      await waitForRootchainTransaction({
        web3,
        transactionHash: ethExitReceipt.transactionHash,
        checkIntervalMs: config.millis_to_wait_for_next_block,
        blocksToWait: config.blocks_to_wait_for_txn,
        onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
      })
      console.log('ETH exits processed')
    }
  } else {
    console.log('No exits in ETH exit queue to process')
  }

  if (!config.erc20_contract_address) {
    console.log('No ERC20 contract defined in config')
    return
  }

  const erc20Queue = await rootChain.getExitQueue(config.erc20_contract_address)
  if (erc20Queue.length) {
    console.log('Current ERC20 exit queue: ', erc20Queue)
    const erc20ExitReceipt = await rootChain.processExits({
      token: config.erc20_contract_address,
      exitId: 0,
      maxExitsToProcess: erc20Queue.length,
      txOptions: {
        privateKey: bobPrivateKey,
        from: bobAddress,
        gas: 6000000
      }
    })
    if (erc20ExitReceipt) {
      console.log(`ERC20 exits processing: ${erc20ExitReceipt.transactionHash}`)
      await waitForRootchainTransaction({
        web3,
        transactionHash: erc20ExitReceipt.transactionHash,
        checkIntervalMs: config.millis_to_wait_for_next_block,
        blocksToWait: config.blocks_to_wait_for_txn,
        onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
      })
      console.log('ERC20 exits processed')
    }
  } else {
    console.log('No exits in ERC20 exit queue to process')
  }
}

processExits()
