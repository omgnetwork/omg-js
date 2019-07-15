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
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const childChain = new ChildChain(config.watcher_url)

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

const aliceAddress = config.alice_eth_address

let bobSpentOnGas

async function exitChildChain () {
  let aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  let bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  let aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  let bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Bob's rootchain balance: ${bobRootchainBalance}`)

  console.log(`Alice's childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : aliceChildchainBalanceArray[0].amount}`)
  console.log(`Bob's childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : bobChildchainBalanceArray[0].amount}`)

  // get deposit UTXO and exit data
  let aliceUtxos = await childChain.getUtxos(aliceAddress)
  let aliceUtxoToExit = aliceUtxos[0]

  let bobUtxos = await childChain.getUtxos(bobAddress)
  let bobUtxoToExit = bobUtxos[0]

  console.log(`Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`)
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  const exitData = await childChain.getExitData(bobUtxoToExit)

  // start a standard exit
  const startExitReceipt = await rootChain.startStandardExit(
    exitData.utxo_pos,
    exitData.txbytes,
    exitData.proof,
    { privateKey: bobPrivateKey, from: bobAddress }
  )

  console.log(`Started standard childchain exit. Start standard exit receipt: ${JSON.stringify(startExitReceipt, undefined, 2)}`)

  const startExitTransaction = await web3.eth.getTransaction(startExitReceipt.transactionHash)

  // track gas spendings
  bobSpentOnGas = web3.utils.toBN(startExitTransaction.gasPrice).muln(startExitReceipt.gasUsed)

  console.log(`Gas used for standard childchain exit: ${bobSpentOnGas}`)

  // wait for challenge period to be over
  let waitMs =
    await rootChain.plasmaContract.methods.getExitableTimestamp(exitData.utxo_pos.toString()).call()
  waitMs = (Number(waitMs) - Math.trunc(Date.now() / 1000)) * 1000

  console.log(`Waiting for ${waitMs} millis for challenge period to end...`)

  await wait(waitMs)

  console.log(`Challenge period to finished`)

  // call processExits() after challenge period is over
  const processExitsPostChallengeReceipt = await rootChain.processExits(
    transaction.ETH_CURRENCY, 0, 1,
    { privateKey: bobPrivateKey, from: bobAddress }
  )

  console.log(`Started post-challenge childchain process exits. ` +
      `Post-challenge childchain process exits receipt: ${JSON.stringify(processExitsPostChallengeReceipt, undefined, 2)}`)

  const processExitsPostChallengeTxn =
      await web3.eth.getTransaction(processExitsPostChallengeReceipt.transactionHash)

  console.log(`Gas used for childchain process exits: ${web3.utils.toBN(processExitsPostChallengeTxn.gasPrice).muln(processExitsPostChallengeReceipt.gasUsed)}`)

  bobSpentOnGas.iadd(web3.utils.toBN(processExitsPostChallengeTxn.gasPrice).muln(processExitsPostChallengeReceipt.gasUsed))
  console.log(`Total gas used: ${bobSpentOnGas}`)

  // get final ETH balance
  aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Final alice rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Final bob rootchain balance: ${bobRootchainBalance}`)

  console.log(`Final alice childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : aliceChildchainBalanceArray[0].amount}`)
  console.log(`Final bob childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : bobChildchainBalanceArray[0].amount}`)

  console.log(`Total gas used: ${bobSpentOnGas}`)

  bobUtxos = await childChain.getUtxos(bobAddress)
  bobUtxoToExit = bobUtxos[0]

  aliceUtxos = await childChain.getUtxos(aliceAddress)
  aliceUtxoToExit = aliceUtxos[0]

  console.log('Alice still has a UTXO as she has not exited yet. But Bob has no remaining UTXOs as he already exited his UTXO.')

  console.log(`Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`)
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  return Promise.resolve()
};

(async () => {
  try {
    await exitChildChain()
  } catch (error) {
    console.log(error)
  }
})()
