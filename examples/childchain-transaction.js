/*
  Copyright 2018 OmiseGO Pte Ltd

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

const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChainPlasmaContractAddress = config.rootchain_plasma_contract_address
const childChain = new ChildChain(config.watcher_url, config.childchain_url)

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const bobAddress = config.bob_eth_address

const transferAmount = BigNumber(web3.utils.toWei(config.alice_eth_transfer_amount, 'ether'))
const feeAmount = BigNumber(web3.utils.toWei('0.00000000000000001', 'ether'))

const payments = [{
  owner: bobAddress,
  currency: transaction.ETH_CURRENCY,
  amount: Number(transferAmount)
}]

const fee = {
  currency: transaction.ETH_CURRENCY,
  amount: Number(feeAmount)
}

async function createSignBuildAndSubmitTransaction () {
  let aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  let bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  let alicesBalanceArray = await childChain.getBalance(aliceAddress)
  let bobsBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Bob's rootchain balance: ${bobRootchainBalance}`)

  console.log(`Alice's childchain balance: ${alicesBalanceArray.length === 0 ? 0 : alicesBalanceArray[0].amount}`)
  console.log(`Bob's childchain balance: ${bobsBalanceArray.length === 0 ? 0 : bobsBalanceArray[0].amount}`)

  const createdTxn = await childChain.createTransaction(
    aliceAddress,
    payments,
    fee,
    transaction.NULL_METADATA
  )

  console.log(`Created a childcahin transaction of ${web3.utils.fromWei(payments[0].amount.toString(), 'ether')} ETH from Alice to Bob.`)

  // get the transaction data
  const typedData = transaction.getTypedData(createdTxn.transactions[0], rootChainPlasmaContractAddress)

  // sign the data
  const signatures = childChain.signTransaction(typedData, [alicePrivateKey])

  // build the signed transaction
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)

  // submit the signed transaction to the childchain
  const transactionReceipt = await childChain.submitTransaction(signedTxn)

  console.log(`Submitted transaction. Transaction receipt: ${JSON.stringify(transactionReceipt, undefined, 2)}`)

  // wait for transaction to be recorded in a block
  console.log(`Waiting for transaction to be recorded in a block...`)
  await wait.wait(40000)

  aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  alicesBalanceArray = await childChain.getBalance(aliceAddress)
  bobsBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Bob's rootchain balance: ${bobRootchainBalance}`)

  console.log(`Alice's childchain balance: ${alicesBalanceArray.length === 0 ? 0 : alicesBalanceArray[0].amount}`)
  console.log(`Bob's childchain balance: ${bobsBalanceArray.length === 0 ? 0 : bobsBalanceArray[0].amount}`)

  return Promise.resolve()
}

(async () => {
  try {
    const result = await createSignBuildAndSubmitTransaction()
    return Promise.resolve(result)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
})()
