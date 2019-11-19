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
const { transaction, hexPrefix } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, {
  transactionConfirmationBlocks: 1
})

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const rootChainPlasmaContractAddress = config.rootchain_plasma_contract_address

const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

const transferAmount = BigNumber(
  web3.utils.toWei(config.alice_eth_transfer_amount, 'ether')
)

async function inflightExitChildChain () {
  let aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  let bobRootchainBalance = await web3.eth.getBalance(bobAddress)
  let aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  let bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log(`Alice's rootchain balance: ${web3.utils.fromWei(String(aliceRootchainBalance), 'ether')} ETH`)
  console.log(`Bob's rootchain balance: ${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`)
  console.log(`Alice's childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : web3.utils.fromWei(String(aliceChildchainBalanceArray[0].amount), 'ether')} ETH`)
  console.log(`Bob's childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : web3.utils.fromWei(String(bobChildchainBalanceArray[0].amount), 'ether')} ETH`)
  console.log('-----')

  const payments = [{
    owner: bobAddress,
    currency: transaction.ETH_CURRENCY,
    amount: Number(transferAmount)
  }]
  const fee = {
    currency: transaction.ETH_CURRENCY,
    amount: 0
  }
  const createdTxn = await childChain.createTransaction(
    aliceAddress,
    payments,
    fee,
    transaction.NULL_METADATA
  )
  // get the transaction data
  const typedData = transaction.getTypedData(
    createdTxn.transactions[0],
    rootChainPlasmaContractAddress
  )
  // sign/build/submit
  const signatures = childChain.signTransaction(typedData, [alicePrivateKey])
  const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
  await childChain.submitTransaction(signedTxn)
  console.log(`Alice sends ${web3.utils.fromWei(Number(transferAmount).toString(), 'ether')} ETH to Bob on the childchain`)

  // Bob hasn't seen the transaction get put into a block and he wants to exit his output.
  // check if queue exists for this token
  const hasToken = await rootChain.hasToken(transaction.ETH_CURRENCY)
  if (!hasToken) {
    console.log(`Adding a ${transaction.ETH_CURRENCY} exit queue`)
    await rootChain.addToken(
      transaction.ETH_CURRENCY,
      { from: bobAddress, privateKey: bobPrivateKey }
    )
  }

  // start an in-flight exit
  const exitData = await childChain.inFlightExitGetData(hexPrefix(signedTxn))
  const outputGuardPreimagesForInputs = ['0x']
  const inputSpendingConditionOptionalArgs = ['0x']
  await rootChain.startInFlightExit(
    exitData.in_flight_tx,
    exitData.input_txs,
    exitData.input_utxos_pos,
    outputGuardPreimagesForInputs,
    exitData.input_txs_inclusion_proofs,
    signatures,
    exitData.in_flight_tx_sigs,
    inputSpendingConditionOptionalArgs,
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  )
  console.log('Bob starts an inflight exit')

  // Decode the transaction to get the index of Bob's output
  const outputIndex = createdTxn.transactions[0].outputs.findIndex(
    e => e.owner.toLowerCase() === bobAddress.toLowerCase()
  )

  // Bob needs to piggyback his output on the in-flight exit
  await rootChain.piggybackInFlightExitOnOutput(
    exitData.in_flight_tx,
    outputIndex,
    '0x',
    {
      privateKey: bobPrivateKey,
      from: bobAddress
    }
  )
  console.log('Bob piggybacks his output')

  // wait for challenge period to complete
  await wait.waitForChallengePeriodToEnd(rootChain, exitData)

  // call processExits() after challenge period is over
  const processExitsPostChallengeReceipt = await rootChain.processExits(
    transaction.ETH_CURRENCY,
    0,
    10,
    { privateKey: bobPrivateKey, from: bobAddress }
  )

  await wait.waitForTransaction(
    web3,
    processExitsPostChallengeReceipt.transactionHash,
    config.millis_to_wait_for_next_block,
    config.blocks_to_wait_for_txn
  )
  console.log('Exits processed')

  // get final ETH balances
  aliceRootchainBalance = await web3.eth.getBalance(aliceAddress)
  bobRootchainBalance = await web3.eth.getBalance(bobAddress)
  aliceChildchainBalanceArray = await childChain.getBalance(aliceAddress)
  bobChildchainBalanceArray = await childChain.getBalance(bobAddress)

  console.log('-----')
  console.log(`Alice rootchain balance: ${web3.utils.fromWei(String(aliceRootchainBalance), 'ether')} ETH`)
  console.log(`Bob rootchain balance: ${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`)
  console.log(`Alice childchain balance: ${aliceChildchainBalanceArray.length === 0 ? 0 : web3.utils.fromWei(String(aliceChildchainBalanceArray[0].amount), 'ether')} ETH`)
  console.log(`Bob childchain balance: ${bobChildchainBalanceArray.length === 0 ? 0 : web3.utils.fromWei(String(bobChildchainBalanceArray[0].amount), 'ether')} ETH`)
}

(async () => {
  try {
    const result = await inflightExitChildChain()
    return Promise.resolve(result)
  } catch (error) {
    console.log(error)
    return Promise.reject(error)
  }
})()
