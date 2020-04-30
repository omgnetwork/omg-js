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

const BigNumber = require('bn.js')
const Web3 = require('web3')
const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction, waitForRootchainTransaction } = require('../packages/omg-js-util/src')
const wait = require('./wait.js')
const getFlags = require('./parse-args')

const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })

async function logBalances (address) {
  const rootchainBalance = await web3.eth.getBalance(address)
  const childchainBalanceArray = await childChain.getBalance(address)
  const ethObject = childchainBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY)
  const childchainETHBalance = ethObject
    ? `${web3.utils.fromWei(String(ethObject.amount))} ETH`
    : '0 ETH'

  console.log(`Rootchain ETH balance: ${web3.utils.fromWei(String(rootchainBalance), 'ether')} ETH`)
  console.log(`Childchain ETH balance: ${childchainETHBalance}`)
}

async function depositEth () {
  try {
    const { owner, amount } = getFlags('owner', 'amount')
    const depositAmount = new BigNumber(web3.utils.toWei(amount, 'ether'))
    const address = config[`${owner}_eth_address`]
    const pk = config[`${owner}_eth_address_private_key`]

    await logBalances(address)
    console.log('-----')

    console.log(`Depositing ${web3.utils.fromWei(depositAmount.toString(), 'ether')} ETH from the rootchain to the childchain`)
    const transactionReceipt = await rootChain.deposit({
      amount: depositAmount,
      txOptions: {
        from: address,
        privateKey: pk
      }
    })
    console.log('Deposit successful: ', transactionReceipt.transactionHash)

    console.log('Waiting for transaction to be recorded by the watcher...')
    await waitForRootchainTransaction({
      web3,
      transactionHash: transactionReceipt.transactionHash,
      checkIntervalMs: config.millis_to_wait_for_next_block,
      blocksToWait: config.blocks_to_wait_for_txn,
      onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
    })

    await wait.wait(5000)
    console.log('-----')
    await logBalances(address)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

depositEth()
