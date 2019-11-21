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
const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url), null, { transactionConfirmationBlocks: 1 })
const erc20Contract = new web3.eth.Contract(erc20abi, config.erc20_contract)

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

module.exports = {
  getERC20Balance,
  approveERC20
}
