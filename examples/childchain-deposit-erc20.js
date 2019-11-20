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
const erc20abi = require('human-standard-token-abi')

const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const { transaction } = require('../packages/omg-js-util/src')

const config = require('./config.js')
const wait = require('./wait.js')

// setup for only 1 transaction confirmation block for fast confirmations
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })

const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
const erc20Contract = new web3.eth.Contract(erc20abi, config.erc20_contract)

const aliceAddress = config.alice_eth_address
const alicePrivateKey = config.alice_eth_address_private_key

async function getERC20Balance (address) {
  const txDetails = {
    from: address,
    to: config.erc20_contract,
    data: erc20Contract.methods.balanceOf(address).encodeABI()
  }
  return web3.eth.call(txDetails)
}

async function approveERC20 (ownerAccount, ownerPrivateKey, spender, value) {
  const txDetails = {
    from: ownerAccount,
    to: config.erc20_contract,
    data: erc20Contract.methods.approve(spender, value).encodeABI(),
    gas: 6000000
  }
  const signedTx = await web3.eth.accounts.signTransaction(txDetails, ownerPrivateKey)
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
}

async function depositERC20IntoPlasmaContract () {
  let rootchainERC20Balance = await getERC20Balance(aliceAddress)
  let childchainBalanceArray = await childChain.getBalance(aliceAddress)
  let erc20Object = childchainBalanceArray.find(i => i.currency === config.erc20_contract)
  let childchainERC20Balance = erc20Object ? erc20Object.amount : 0

  console.log('ERC20 token used for this example: ', config.erc20_contract)
  console.log(`Alice's rootchain ERC20 balance: ${web3.utils.hexToNumber(rootchainERC20Balance)}`)
  console.log(`Alice's childchain ERC20 balance: ${childchainERC20Balance}`)
  console.log('-----')

  const erc20VaultAddress = await rootChain.getErc20VaultAddress()
  await approveERC20(aliceAddress, alicePrivateKey, erc20VaultAddress, config.alice_erc20_deposit_amount)
  console.log('ERC20 approved')

  const depositTransaction = transaction.encodeDeposit(aliceAddress, config.alice_erc20_deposit_amount, config.erc20_contract)

  console.log(`Depositing ${config.alice_erc20_deposit_amount} ERC20 from the rootchain to the childchain`)

  // deposit ERC20 into the Plasma contract
  await rootChain.depositToken(depositTransaction, {
    from: aliceAddress,
    privateKey: alicePrivateKey,
    gas: 6000000
  })
  console.log('Deposit successful')
  console.log('Waiting for transaction to be recorded by the watcher...')
  await wait.wait(40000)

  rootchainERC20Balance = await getERC20Balance(aliceAddress)
  childchainBalanceArray = await childChain.getBalance(aliceAddress)
  erc20Object = childchainBalanceArray.find(i => i.currency === config.erc20_contract)
  childchainERC20Balance = erc20Object ? erc20Object.amount : 0

  console.log('-----')
  console.log(`Alice's rootchain ERC20 balance: ${web3.utils.hexToNumber(rootchainERC20Balance)}`)
  console.log(`Alice's childchain ERC20 balance: ${childchainERC20Balance}`)
}

depositERC20IntoPlasmaContract()
