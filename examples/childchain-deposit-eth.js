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

const BigNumber = require('bignumber.js')
const Web3 = require('web3')

const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const depositAmount = BigNumber(web3.utils.toWei(config.alice_eth_deposit_amount, 'ether'))

async function depositEthIntoPlasmaContract () {
  let rootchainBalance = await web3.eth.getBalance(aliceAddress)
  let childchainBalanceArray = await childChain.getBalance(aliceAddress)
  let childchainETHBalance = childchainBalanceArray.length === 0
    ? '0 ETH'
    : `${web3.utils.fromWei(String(childchainBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY).amount))} ETH`

  console.log(`Alice's rootchain ETH balance: ${web3.utils.fromWei(String(rootchainBalance), 'ether')} ETH`)
  console.log(`Alice's childchain ETH balance: ${childchainETHBalance}`)
  console.log('-----')

  const depositTransaction = transaction.encodeDeposit(aliceAddress, depositAmount, transaction.ETH_CURRENCY)

  console.log(`Depositing ${web3.utils.fromWei(depositAmount.toString(), 'ether')} ETH from the rootchain to the childchain`)

  // deposit ETH into the Plasma contract
  const transactionReceipt = await rootChain.depositEth(depositTransaction, depositAmount, {
    from: aliceAddress,
    privateKey: alicePrivateKey
  })
  console.log('Deposit successful')
  console.log('Waiting for transaction to be recorded by the watcher...')

  await wait.waitForTransaction(web3, transactionReceipt.transactionHash, config.millis_to_wait_for_next_block, config.blocks_to_wait_for_txn)

  rootchainBalance = await web3.eth.getBalance(aliceAddress)
  childchainBalanceArray = await childChain.getBalance(aliceAddress)
  childchainETHBalance = childchainBalanceArray.length === 0
    ? '0 ETH'
    : `${web3.utils.fromWei(String(childchainBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY).amount))} ETH`
  console.log('-----')
  console.log(`Alice's rootchain ETH balance: ${web3.utils.fromWei(String(rootchainBalance), 'ether')} ETH`)
  console.log(`Alice's childchain ETH balance: ${childchainETHBalance}`)
}

depositEthIntoPlasmaContract()
