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

const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction, waitForChildchainBalance } = require('../packages/omg-js-util/src')
const getFlags = require('./parse-args')
const config = require('./config.js')

const rootChainPlasmaContractAddress = config.plasmaframework_contract_address
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })

async function logBalances (address) {
  const balanceArray = await childChain.getBalance(address)
  const erc20Object = balanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase())
  const childchainErc20Balance = erc20Object ? erc20Object.amount : 0

  console.log(`Childchain ERC20 balance: ${childchainErc20Balance}`)
  return { erc20Balance: childchainErc20Balance }
}

async function transactionErc20 () {
  try {
    if (!config.erc20_contract_address) {
      console.log('Please define an ERC20 contract address in your .env')
      return
    }

    const { from, to, amount } = getFlags('from', 'to', 'amount')
    const fromAddress = config[`${from}_eth_address`]
    const fromPk = config[`${from}_eth_address_private_key`]
    const toAddress = config[`${to}_eth_address`]

    const { erc20Balance } = await logBalances(toAddress)
    console.log('-----')

    const payments = [{
      owner: toAddress,
      currency: config.erc20_contract_address,
      amount: Number(amount)
    }]
    const fee = { currency: transaction.ETH_CURRENCY }

    const createdTxn = await childChain.createTransaction({
      owner: fromAddress,
      payments,
      fee,
      metadata: 'hello world'
    })
    console.log(`Created a childchain transaction of ${amount} ERC20`)
    // type/sign/build/submit
    const typedData = transaction.getTypedData(createdTxn.transactions[0], rootChainPlasmaContractAddress)
    const privateKeys = new Array(createdTxn.transactions[0].inputs.length).fill(fromPk)
    const signatures = childChain.signTransaction(typedData, privateKeys)
    const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
    const receipt = await childChain.submitTransaction(signedTxn)
    console.log('Transaction submitted: ', receipt.txhash)

    console.log('Waiting for transaction to be recorded by the watcher...')
    const expectedAmount = Number(amount) + erc20Balance
    await waitForChildchainBalance({
      childChain,
      address: toAddress,
      expectedAmount,
      currency: config.erc20_contract_address
    })

    console.log('-----')
    await logBalances(toAddress)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

transactionErc20()
