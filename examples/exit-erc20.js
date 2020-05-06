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
const getFlags = require('./parse-args')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })

async function logBalances (address) {
  const rootchainBalance = await getErc20Balance({
    web3,
    address,
    erc20Address: config.erc20_contract_address
  })
  const childchainBalanceArray = await childChain.getBalance(address)
  const erc20Object = childchainBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase())
  const childchainBalance = erc20Object ? erc20Object.amount : 0

  console.log(`Rootchain ERC20 balance: ${rootchainBalance}`)
  console.log(`Childchain ERC20 balance: ${childchainBalance}`)
}

async function exitErc20 () {
  try {
    if (!config.erc20_contract_address) {
      console.log('Please define an ERC20 contract in your .env')
      return
    }
    const { owner } = getFlags('owner')
    const address = config[`${owner}_eth_address`]
    const pk = config[`${owner}_eth_address_private_key`]

    const rootchainBalance = await web3.eth.getBalance(address)
    const etherBalance = web3.utils.fromWei(String(rootchainBalance), 'ether')
    if (etherBalance < 0.001) {
      console.log('Not enough ETH on the rootchain to start an exit')
      return
    }
    await logBalances(address)
    console.log('-----')

    // get a ERC20 UTXO and exit data
    const utxos = await childChain.getUtxos(address)
    const utxoToExit = utxos.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase())
    if (!utxoToExit) {
      console.log('No ERC20 UTXOs to exit')
      return
    }

    console.log(`Exiting ${utxoToExit.amount} ERC20 with this UTXO:\n${JSON.stringify(utxoToExit, undefined, 2)}`)

    // check if queue exists for this token
    const hasToken = await rootChain.hasToken(config.erc20_contract_address)
    if (!hasToken) {
      console.log(`Adding a ${config.erc20_contract_address} exit queue`)
      await rootChain.addToken({
        token: config.erc20_contract_address,
        txOptions: { from: address, privateKey: pk }
      })
    }

    // start a standard exit
    const exitData = await childChain.getExitData(utxoToExit)
    const standardExitReceipt = await rootChain.startStandardExit({
      utxoPos: exitData.utxo_pos,
      outputTx: exitData.txbytes,
      inclusionProof: exitData.proof,
      txOptions: {
        privateKey: pk,
        from: address
      }
    })
    console.log('Started a standard exit: ', standardExitReceipt.transactionHash)

    const exitId = await rootChain.getStandardExitId({
      txBytes: exitData.txbytes,
      utxoPos: exitData.utxo_pos,
      isDeposit: utxoToExit.blknum % 1000 !== 0
    })
    console.log('Exit id: ', exitId)

    const { msUntilFinalization } = await rootChain.getExitTime({
      exitRequestBlockNumber: standardExitReceipt.blockNumber,
      submissionBlockNumber: utxoToExit.blknum
    })

    await wait.wait(msUntilFinalization)
    const processExitReceipt = await rootChain.processExits({
      token: config.erc20_contract_address,
      exitId: 0,
      maxExitsToProcess: 20,
      txOptions: {
        privateKey: pk,
        from: address
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
    await logBalances(address)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

exitErc20()
