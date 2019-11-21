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
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

const rootChainPlasmaContractAddress = config.rootchain_plasma_contract_address
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key
const bobAddress = config.bob_eth_address

async function logBalances () {
  const alicesBalanceArray = await childChain.getBalance(aliceAddress)
  const aliceErc20Object = alicesBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract.toLowerCase())
  const alicesChildchainERC20Balance = aliceErc20Object ? aliceErc20Object.amount : 0

  const bobsBalanceArray = await childChain.getBalance(bobAddress)
  const bobErc20Object = bobsBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract.toLowerCase())
  const bobsChildchainERC20Balance = bobErc20Object ? bobErc20Object.amount : 0

  console.log(`Alice's childchain ERC20 balance: ${alicesChildchainERC20Balance}`)
  console.log(`Bob's childchain ERC20 balance: ${bobsChildchainERC20Balance}`)
  return { bobERC20Balance: bobsChildchainERC20Balance }
}

async function erc20Transaction () {
  if (!config.erc20_contract) {
    console.log('Please define an ERC20 contract in your .env')
    return
  }
  const { bobERC20Balance } = await logBalances()
  console.log('-----')

  const payments = [{
    owner: bobAddress,
    currency: config.erc20_contract,
    amount: Number(config.alice_erc20_transfer_amount)
  }]
  const fee = {
    currency: transaction.ETH_CURRENCY,
    amount: 1
  }
  const createdTxn = await childChain.createTransaction(
    aliceAddress,
    payments,
    fee,
    transaction.NULL_METADATA
  )
  console.log(`Created a childchain transaction of ${config.alice_erc20_transfer_amount} ERC20 from Alice to Bob.`)
  // type/sign/build/submit
  const typedData = transaction.getTypedData(createdTxn.transactions[0], rootChainPlasmaContractAddress)
  const privateKeys = new Array(createdTxn.transactions[0].inputs.length).fill(alicePrivateKey)
  const signatures = childChain.signTransaction(typedData, privateKeys)
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
  await childChain.submitTransaction(signedTxn)

  console.log('Transaction submitted')
  console.log('Waiting for transaction to be recorded by the watcher...')
  const expectedAmount = Number(config.alice_erc20_transfer_amount) + bobERC20Balance
  await wait.waitForBalanceEq(childChain, bobAddress, expectedAmount, config.erc20_contract)

  console.log('-----')
  await logBalances()
}

erc20Transaction()
