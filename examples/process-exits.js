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

  const ethExitReceipt = await rootChain.processExits(
    transaction.ETH_CURRENCY, 0, 20,
    {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  )
  if (ethExitReceipt) {
    console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`)
    await waitForRootchainTransaction({
      web3,
      transactionHash: ethExitReceipt.transactionHash,
      millisToWaitForTxn: config.millis_to_wait_for_next_block,
      blocksToWaitForTxn: config.blocks_to_wait_for_txn,
      onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
    })
    console.log('ETH exits processed')
  }

  if (!config.erc20_contract) {
    return
  }

  const erc20ExitReceipt = await rootChain.processExits(
    config.erc20_contract, 0, 20,
    {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  )
  if (erc20ExitReceipt) {
    console.log(`ERC20 exits processing: ${erc20ExitReceipt.transactionHash}`)
    await waitForRootchainTransaction({
      web3,
      transactionHash: erc20ExitReceipt.transactionHash,
      millisToWaitForTxn: config.millis_to_wait_for_next_block,
      blocksToWaitForTxn: config.blocks_to_wait_for_txn,
      onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
    })
    console.log('ERC20 exits processed')
  }
}

processExits()
