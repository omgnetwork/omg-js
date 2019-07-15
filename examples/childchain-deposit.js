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
const childChain = new ChildChain(config.watcher_url)

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const depositAmount = BigNumber(web3.utils.toWei('2', 'ether'))

async function depositEthIntoPlasmaContract () {
  let rootchainBalance = await web3.eth.getBalance(aliceAddress)

  console.log(`Alice's rootchain balance: ${rootchainBalance}`)

  let childchainBalanceArray = await childChain.getBalance(aliceAddress)
  let childchainBalance

  console.log(`Alice's childchain balance: ${childchainBalanceArray.length === 0 ? 0 : childchainBalanceArray[0].amount}`)

  const depositTransaction = transaction.encodeDeposit(aliceAddress, depositAmount, transaction.ETH_CURRENCY)

  console.log(`Depositing ${web3.utils.fromWei(depositAmount.toString(), 'ether')} ETH from the rootchain to the childchain`)
  console.log(`Awaiting rootChain.depositEth()...`)

  // deposit ETH into the Plasma contract
  const transactionReceipt = await rootChain.depositEth(depositTransaction, depositAmount, {
    from: aliceAddress,
    privateKey: alicePrivateKey
  })

  console.log(`Finished awaiting rootChain.depositEth()`)
  console.log(`Transaction receipt: ${JSON.stringify(transactionReceipt, undefined, 2)}`)

  // wait for transaction to be recorded in a block
  console.log(`Waiting for transaction to be recorded in a block...`)
  await wait(40000)

  rootchainBalance = await web3.eth.getBalance(aliceAddress)
  console.log(`Alice's new rootchain balance: ${rootchainBalance}`)

  childchainBalanceArray = await childChain.getBalance(aliceAddress)
  childchainBalance = childchainBalanceArray[0].amount
  console.log(`Alice's new childchain balance: ${childchainBalance}`)

  return Promise.resolve()
}

(async () => {
  try {
    await depositEthIntoPlasmaContract()
  } catch (error) {
    console.log(error)
  }
})()
