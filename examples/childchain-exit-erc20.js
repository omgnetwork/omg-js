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
const { getErc20Balance, waitForRootchainTransaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchain_plasma_contract_address })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const bobAddress = config.bob_eth_address
const bobPrivateKey = config.bob_eth_address_private_key

async function logBalances () {
  const bobRootchainBalance = await getErc20Balance({
    web3,
    address: bobAddress,
    erc20Address: config.erc20_contract
  })
  const bobChildchainBalanceArray = await childChain.getBalance(bobAddress)
  const bobErc20Object = bobChildchainBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract.toLowerCase())
  const bobChildchainBalance = bobErc20Object ? bobErc20Object.amount : 0

  console.log(`Bob's rootchain ERC20 balance: ${web3.utils.hexToNumber(bobRootchainBalance)}`)
  console.log(`Bob's childchain ERC20 balance: ${bobChildchainBalance}`)
}

async function exitChildChainErc20 () {
  if (!config.erc20_contract) {
    console.log('Please define an ERC20 contract in your .env')
    return
  }

  await logBalances()
  console.log('-----')

  // get a ERC20 UTXO and exit data
  const bobUtxos = await childChain.getUtxos(bobAddress)
  const bobUtxoToExit = bobUtxos.find(i => i.currency.toLowerCase() === config.erc20_contract.toLowerCase())
  if (!bobUtxoToExit) {
    console.log('Bob doesnt have any ERC20 UTXOs to exit')
    return
  }

  console.log(`Bob's wants to exit ${bobUtxoToExit.amount} ERC20 with this UTXO:\n${JSON.stringify(bobUtxoToExit, undefined, 2)}`)

  // check if queue exists for this token
  const hasToken = await rootChain.hasToken(config.erc20_contract)
  if (!hasToken) {
    console.log(`Adding a ${config.erc20_contract} exit queue`)
    await rootChain.addToken({
      token: config.erc20_contract,
      txOptions: { from: bobAddress, privateKey: bobPrivateKey }
    })
  }

  // start a standard exit
  const exitData = await childChain.getExitData(bobUtxoToExit)
  const standardExitReceipt = await rootChain.startStandardExit({
    outputId: exitData.utxo_pos,
    outputTx: exitData.txbytes,
    inclusionProof: exitData.proof,
    txOptions: {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  })
  console.log('Bob started a standard exit: ', standardExitReceipt.transactionHash)

  const exitId = await rootChain.getStandardExitId({
    txBytes: exitData.txbytes,
    utxoPos: exitData.utxo_pos,
    isDeposit: bobUtxoToExit.blknum % 1000 !== 0
  })
  console.log('Exit id: ', exitId)

  await wait.waitForChallengePeriodToEnd(rootChain, exitData)
  const processExitReceipt = await rootChain.processExits({
    token: config.erc20_contract,
    exitId,
    maxExitsToProcess: 20,
    txOptions: {
      privateKey: bobPrivateKey,
      from: bobAddress,
      gas: 6000000
    }
  })
  if (processExitReceipt) {
    console.log(`ERC20 exits processing: ${processExitReceipt.transactionHash}`)
    await waitForRootchainTransaction({
      web3,
      transactionHash: processExitReceipt.transactionHash,
      checkIntervalMs: config.millis_to_wait_for_next_block,
      blocksToWait: config.blocks_to_wait_for_txn,
      onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
    })
  }
  console.log('Exits processed')

  console.log('-----')
  await logBalances()
}

exitChildChainErc20()
