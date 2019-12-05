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
const { transaction, getErc20Balance, waitForRootchainTransaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })
const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchain_plasma_contract_address })
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

async function logBalances () {
  const rootchainERC20Balance = await getErc20Balance({
    web3,
    address: aliceAddress,
    erc20Address: config.erc20_contract
  })
  const childchainBalanceArray = await childChain.getBalance(aliceAddress)
  const erc20Object = childchainBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract.toLowerCase())
  const childchainERC20Balance = erc20Object ? erc20Object.amount : 0

  console.log(`Alice's rootchain ERC20 balance: ${rootchainERC20Balance}`)
  console.log(`Alice's childchain ERC20 balance: ${childchainERC20Balance}`)
}

async function depositERC20IntoPlasmaContract () {
  if (!config.erc20_contract) {
    console.log('Please define an ERC20 contract in your .env')
    return
  }

  await logBalances()
  console.log('-----')

  console.log('Approving ERC20 for deposit...')
  const approveRes = await rootChain.approveToken({
    erc20Address: config.erc20_contract,
    amount: config.alice_erc20_deposit_amount,
    txOptions: {
      from: aliceAddress,
      privateKey: alicePrivateKey,
      gas: 6000000
    }
  })
  console.log('ERC20 approved: ', approveRes.transactionHash)

  const depositTx = transaction.encodeDeposit(aliceAddress, config.alice_erc20_deposit_amount, config.erc20_contract)

  console.log(`Depositing ${config.alice_erc20_deposit_amount} ERC20 from the rootchain to the childchain`)
  const depositReceipt = await rootChain.depositToken({
    depositTx,
    txOptions: {
      from: aliceAddress,
      privateKey: alicePrivateKey,
      gas: 6000000
    }
  })
  console.log('Deposit successful: ', depositReceipt.transactionHash)
  console.log('Waiting for transaction to be recorded by the watcher...')
  await waitForRootchainTransaction({
    web3,
    transactionHash: depositReceipt.transactionHash,
    checkIntervalMs: config.millis_to_wait_for_next_block,
    blocksToWait: config.blocks_to_wait_for_txn,
    onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
  })

  console.log('-----')
  await logBalances()
}

depositERC20IntoPlasmaContract()
