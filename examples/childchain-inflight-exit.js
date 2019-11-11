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

// setup for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, {
  transactionConfirmationBlocks: 1
})

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const rootChainPlasmaContractAddress = config.rootchain_plasma_contract_address

const childChain = new ChildChain({ watcherUrl: config.watcher_url })

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

const transferAmount = BigNumber(
  web3.utils.toWei(config.alice_eth_transfer_amount, 'ether')
)

async function inflightExitChildChain() {
  let aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  let bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  let aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  let bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Bob's rootchain balance: ${bobRootchainBalance}`)

  console.log(
    `Alice's childchain balance: ${
      aliceChildchainBalanceArray.length === 0
        ? 0
        : aliceChildchainBalanceArray[0].amount
    }`
  )
  console.log(
    `Bob's childchain balance: ${
      bobChildchainBalanceArray.length === 0
        ? 0
        : bobChildchainBalanceArray[0].amount
    }`
  )

  const utxos = await childChain.getUtxos(aliceAddress)

  console.log(`Alice's UTXOS = ${JSON.stringify(utxos, undefined, 2)}`)

  const createdTxn = transaction.createTransactionBody(
    aliceAddress,
    utxos,
    bobAddress,
    transferAmount,
    transaction.ETH_CURRENCY
  )

  console.log(
    `Created a childchain transaction of ${web3.utils.fromWei(
      Number(transferAmount).toString(),
      'ether'
    )} ETH from Alice to Bob.`
  )
  // get the transaction data
  const typedData = transaction.getTypedData(
    createdTxn,
    rootChainPlasmaContractAddress
  )
  // sign the data
  const signatures = childChain.signTransaction(typedData, [alicePrivateKey])

  // build the signed transaction
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)

  // submit the signed transaction to the childchain
  const transactionReceipt = await childChain.submitTransaction(signedTxn)

  console.log(
    `Submitted transaction. Transaction receipt: ${JSON.stringify(
      transactionReceipt,
      undefined,
      2
    )}`
  )

  // get deposit UTXO and exit data
  let aliceUtxos = await childChain.getUtxos(aliceAddress)
  let aliceUtxoToExit = aliceUtxos[0]

  let bobUtxos = await childChain.getUtxos(bobAddress)
  let bobUtxoToExit = bobUtxos[0]

  console.log(
    `Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`
  )
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  // Bob hasn't seen the transaction get put into a block and he wants to exit now.

  console.log(`Alice's signed TX: ${signedTxn}`)

  // get the exit data
  const exitData = await childChain.inFlightExitGetData(signedTxn)

  console.log(`Bob's exit data = ${JSON.stringify(exitData, undefined, 2)}`)

  // start an in-flight exit
  const outputGuardPreimagesForInputs = ['0x']
  const inputSpendingConditionOptionalArgs = ['0x']
  let startInflightExitReceipt = await rootChain.startInFlightExit(
    exitData.in_flight_tx,
    exitData.input_txs,
    exitData.input_txs_inclusion_proofs,
    exitData.in_flight_tx_sigs,
    exitData.input_utxos_pos,
    signatures,
    outputGuardPreimagesForInputs,
    inputSpendingConditionOptionalArgs,
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  )
  console.log(
    `Bob started inflight roothchain exit. Inflight exit receipt: ${JSON.stringify(
      startInflightExitReceipt,
      undefined,
      2
    )}`
  )

  // Bob needs to piggyback his output on the in-flight exit
  const piggybackInFlightExitReceipt = await rootChain.piggybackInFlightExit(
    exitData.in_flight_tx,
    outputIndex,
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  )

  console.log(
    `Bob called piggybacked his output. piggybackInFlightExitReceipt = ` +
      `${JSON.stringify(piggybackInFlightExitReceipt)}`
  )

  // wait for challenge period to complete
  await wait.waitForChallengePeriodToEnd(rootChain, exitData)

  // call processExits() after challenge period is over
  const processExitsPostChallengeReceipt = await rootChain.processExit(
    0,
    transaction.ETH_CURRENCY,
    { privateKey: bobPrivateKey, from: bobAddress }
  )

  console.log(
    `Post-challenge process exits started. Process exits receipt: ${JSON.stringify(
      processExitsPostChallengeReceipt,
      undefined,
      2
    )}`
  )

  await wait.waitForTransaction(
    web3,
    processExitsPostChallengeReceipt.transactionHash,
    config.millis_to_wait_for_next_block,
    config.blocks_to_wait_for_txn
  )

  // get final ETH balance
  aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  bobRootchainBalance = await web3.eth.getBalance(bobAddress)

  aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Final alice rootchain balance: ${aliceRootchainBalance}`)
  console.log(`Final bob rootchain balance: ${bobRootchainBalance}`)

  console.log(
    `Final alice childchain balance: ${
      aliceChildchainBalanceArray.length === 0
        ? 0
        : aliceChildchainBalanceArray[0].amount
    }`
  )
  console.log(
    `Final bob childchain balance: ${
      bobChildchainBalanceArray.length === 0
        ? 0
        : bobChildchainBalanceArray[0].amount
    }`
  )

  bobUtxos = await childChain.getUtxos(bobAddress)
  bobUtxoToExit = bobUtxos[0]

  aliceUtxos = await childChain.getUtxos(aliceAddress)
  aliceUtxoToExit = aliceUtxos[0]

  console.log(
    'Alice still has a UTXO as she has not exited yet. But Bob has no remaining UTXOs as he already exited his UTXO.'
  )

  console.log(
    `Alice's UTXOS = ${JSON.stringify(aliceUtxoToExit, undefined, 2)}`
  )
  console.log(`Bob's UTXOs = ${JSON.stringify(bobUtxoToExit, undefined, 2)}`)
}

;(async () => {
  try {
    const result = await inflightExitChildChain()
    return Promise.resolve(result)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
})()
