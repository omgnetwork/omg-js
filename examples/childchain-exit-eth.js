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

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })
const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

async function logBalances () {
  const bobRootchainBalance = await web3.eth.getBalance(bobAddress)
  const bobChildchainBalanceArray = await childChain.getBalance(bobAddress)
  const bobsEthObject = bobChildchainBalanceArray.find(i => i.currency === transaction.ETH_CURRENCY)
  const bobChildchainETHBalance = bobsEthObject
    ? `${web3.utils.fromWei(String(bobsEthObject.amount))} ETH`
    : '0 ETH'

  console.log(`Bob's rootchain balance: ${web3.utils.fromWei(String(bobRootchainBalance), 'ether')} ETH`)
  console.log(`Bob's childchain balance: ${bobChildchainETHBalance}`)
}

async function exitChildChain () {
  await logBalances()
  console.log('-----')

  // get ETH UTXO and exit data
  const bobUtxos = await childChain.getExitableUtxos(bobAddress)
  const bobUtxoToExit = bobUtxos.find(i => i.currency === transaction.ETH_CURRENCY)
  if (!bobUtxoToExit) {
    console.log('Bob doesnt have any ETH UTXOs to exit')
    return
  }

  console.log(`Bob's wants to exit ${web3.utils.fromWei(String(bobUtxoToExit.amount), 'ether')} ETH with this UTXO:\n${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  // check if queue exists for this token
  const hasToken = await rootChain.hasToken(transaction.ETH_CURRENCY)
  if (!hasToken) {
    console.log(`Adding a ${transaction.ETH_CURRENCY} exit queue`)
    await rootChain.addToken(
      transaction.ETH_CURRENCY,
      { from: bobAddress, privateKey: bobPrivateKey }
    )
  }

  // start a standard exit
  const exitData = await childChain.getExitData(bobUtxoToExit)
  await rootChain.startStandardExit(
    exitData.utxo_pos,
    exitData.txbytes,
    exitData.proof,
    {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  )
  console.log('Bob started a standard exit')

  await wait.waitForChallengePeriodToEnd(rootChain, exitData)
  // call processExits after challenge period is over
  await rootChain.processExits(
    transaction.ETH_CURRENCY, 0, 20,
    {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  )
  console.log('Exits processed')

  console.log('-----')
  await logBalances()
}

exitChildChain()