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
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction, waitForChildchainBalance } = require('../packages/omg-js-util/src')
const getFlags = require('./parse-args')
const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })
const rootChainPlasmaContractAddress = config.plasmaframework_contract_address

async function logBalances (address) {
  const balanceArray = await childChain.getBalance(address)
  const ethObject = balanceArray.find(i => i.currency === transaction.ETH_CURRENCY)
  const childchainEthBalance = ethObject
    ? `${web3.utils.fromWei(String(ethObject.amount))} ETH`
    : '0 ETH'

  console.log(`Recipient childchain ETH balance: ${childchainEthBalance}`)
  return { ethBalance: ethObject ? ethObject.amount : 0 }
}

async function transactionEth () {
  try {
    const { from, to, amount } = getFlags('from', 'to', 'amount')
    const fromAddress = config[`${from}_eth_address`]
    const fromPk = config[`${from}_eth_address_private_key`]
    const toAddress = config[`${to}_eth_address`]
    const transferAmount = new BigNumber(web3.utils.toWei(amount, 'ether'))

    const { ethBalance } = await logBalances(toAddress)
    console.log('-----')

    const payments = [{
      owner: toAddress,
      currency: transaction.ETH_CURRENCY,
      amount: transferAmount
    }]
    const fee = { currency: transaction.ETH_CURRENCY }

    const createdTxn = await childChain.createTransaction({
      owner: fromAddress,
      payments,
      fee,
      metadata: 'hello'
    })

    console.log(`Created a childchain transaction of ${web3.utils.fromWei(payments[0].amount.toString(), 'ether')} ETH`)

    // type/sign/build/submit
    const typedData = transaction.getTypedData(createdTxn.transactions[0], rootChainPlasmaContractAddress)
    const privateKeys = new Array(createdTxn.transactions[0].inputs.length).fill(fromPk)
    const signatures = childChain.signTransaction(typedData, privateKeys)
    const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
    const receipt = await childChain.submitTransaction(signedTxn)
    console.log('Transaction submitted: ', receipt.txhash)

    // wait for transaction to be recorded by the watcher
    console.log('Waiting for transaction to be recorded by the watcher...')
    const expectedAmount = transferAmount.add(new BigNumber(ethBalance))
    await waitForChildchainBalance({
      childChain,
      address: toAddress,
      expectedAmount
    })

    console.log('-----')
    await logBalances(toAddress)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

transactionEth()
