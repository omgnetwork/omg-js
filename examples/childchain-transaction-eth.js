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

const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const rootChainPlasmaContractAddress = config.plasmaframework_contract_address
const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key
const bobAddress = config.bob_eth_address

async function logBalances () {
  const alicesBalanceArray = await childChain.getBalance(aliceAddress)
  const alicesEthObject = alicesBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY)
  const alicesChildchainETHBalance = alicesEthObject
    ? `${web3.utils.fromWei(String(alicesEthObject.amount))} ETH`
    : '0 ETH'

  const bobsBalanceArray = await childChain.getBalance(bobAddress)
  const bobsEthObject = bobsBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY)
  const bobsChildchainETHBalance = bobsEthObject
    ? `${web3.utils.fromWei(String(bobsEthObject.amount))} ETH`
    : '0 ETH'

  console.log(`Alice's childchain ETH balance: ${alicesChildchainETHBalance}`)
  console.log(`Bob's childchain ETH balance: ${bobsChildchainETHBalance}`)
  return { bobETHBalance: bobsEthObject ? bobsEthObject.amount : 0 }
}

async function childchainTransactionEth () {
  const { bobETHBalance } = await logBalances()
  console.log('-----')

  const transferAmount = new BigNumber(web3.utils.toWei(config.alice_eth_transfer_amount, 'ether'))
  const feeAmount = new BigNumber(web3.utils.toWei('0.00000000000000001', 'ether'))

  const payments = [{
    owner: bobAddress,
    currency: transaction.ETH_CURRENCY,
    amount: Number(transferAmount)
  }]
  const fee = {
    currency: transaction.ETH_CURRENCY,
    amount: Number(feeAmount)
  }

  const createdTxn = await childChain.createTransaction({
    owner: aliceAddress,
    payments,
    fee,
    metadata: 'hello'
  })
  console.log(`Created a childchain transaction of ${web3.utils.fromWei(payments[0].amount.toString(), 'ether')} ETH from Alice to Bob.`)

  // type/sign/build/submit
  const typedData = transaction.getTypedData(createdTxn.transactions[0], rootChainPlasmaContractAddress)
  const privateKeys = new Array(createdTxn.transactions[0].inputs.length).fill(alicePrivateKey)
  const signatures = childChain.signTransaction(typedData, privateKeys)
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
  const receipt = await childChain.submitTransaction(signedTxn)
  console.log('Transaction submitted: ', receipt.txhash)

  // wait for transaction to be recorded by the watcher
  console.log('Waiting for transaction to be recorded by the watcher...')
  const expectedAmount = transferAmount.add(new BigNumber(bobETHBalance))
  await waitForChildchainBalance({
    childChain,
    address: bobAddress,
    expectedAmount
  })

  console.log('-----')
  await logBalances()
}

childchainTransactionEth()
