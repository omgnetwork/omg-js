/*
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const promiseRetry = require('promise-retry')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const fetch = require('node-fetch')
const erc20abi = require('human-standard-token-abi')

function createAccount (web3) {
  const ret = web3.eth.accounts.create()
  ret.address = ret.address.toLowerCase()
  return ret
}

async function setGas (eth, txDetails) {
  if (!txDetails.gas) {
    txDetails.gas = await eth.estimateGas(txDetails)
  }
  if (!txDetails.gasPrice) {
    txDetails.gasPrice = await eth.getGasPrice()
  }
}

async function sendTransaction (web3, txDetails, privateKey) {
  await setGas(web3.eth, txDetails)

  if (!privateKey) {
    // No privateKey to sign with, assume sending from an unlocked geth account
    return web3.eth.sendTransaction(txDetails)
  } else {
    // First sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, privateKey)
    // Then send it
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

async function spentOnGas (web3, receipt) {
  const tx = await web3.eth.getTransaction(receipt.transactionHash)
  return web3.utils.toBN(tx.gasPrice).muln(receipt.gasUsed)
}

function waitForEthBalance (web3, address, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ETH balance...  (${number})`)
    const resp = await web3.eth.getBalance(address)
    if (!callback(resp)) {
      retry()
    }
    return resp
  }, {
    minTimeout: 2000,
    factor: 1,
    retries: 30
  })
}

function waitForEthBalanceEq (web3, address, expectedAmount) {
  const expectedBn = numberToBN(expectedAmount)
  return waitForEthBalance(web3, address, balance => numberToBN(balance).eq(expectedBn))
}

async function getERC20Balance (web3, contract, address) {
  const txDetails = {
    from: address,
    to: contract._address,
    data: contract.methods.balanceOf(address).encodeABI()
  }

  return web3.eth.call(txDetails)
}

function waitForERC20Balance (web3, address, contractAddress, callback) {
  const contract = new web3.eth.Contract(erc20abi, contractAddress)
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ERC20 balance...  (${number})`)
    const resp = await getERC20Balance(web3, contract, address)
    if (!callback(resp)) {
      retry()
    }
    return resp
  }, {
    minTimeout: 2000,
    factor: 1,
    retries: 30
  })
}

function waitForERC20BalanceEq (web3, address, contractAddress, expectedAmount) {
  const expectedBn = numberToBN(expectedAmount)
  return waitForERC20Balance(web3, address, contractAddress, balance => numberToBN(balance).eq(expectedBn))
}

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function approveERC20 (
  web3,
  erc20Contract,
  ownerAccount,
  ownerAccountPassword,
  spender,
  value
) {
  const txDetails = {
    from: ownerAccount,
    to: erc20Contract._address,
    data: erc20Contract.methods.approve(spender, value).encodeABI()
  }

  return sendTransaction(web3, txDetails, ownerAccountPassword)
}

async function depositEth (rootChain, childChain, address, amount, privateKey) {
  const depositTx = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
  return rootChain.depositEth(depositTx, amount, { from: address, privateKey })
}

async function depositToken (rootChain, childChain, address, amount, currency, privateKey) {
  const depositTx = transaction.encodeDeposit(address, amount, currency)
  return rootChain.depositToken(depositTx, { from: address, privateKey })
}

async function getPlasmaContractAddress (config) {
  if (config.rootchainContract && config.rootchainContract !== '') {
    return { contract_addr: config.rootchainContract }
  } else if (config.contract_exchanger_url && config.contract_exchanger_url !== '') {
    const repsonse = await fetch(config.contract_exchanger_url)
    return repsonse.json()
  }

  throw new Error('No ROOTCHAIN_CONTRACT or CONTRACT_EXCHANGER_URL configured')
}

async function getTimeToExit (plasmaContract, output) {
  const exitableAt = await plasmaContract.methods.getExitableTimestamp(output.toString()).call()
  return (Number(exitableAt) - Math.trunc(Date.now() / 1000)) * 1000
}

module.exports = {
  createAccount,
  waitForEthBalance,
  waitForEthBalanceEq,
  waitForERC20Balance,
  waitForERC20BalanceEq,
  sleep,
  sendTransaction,
  depositEth,
  depositToken,
  approveERC20,
  getERC20Balance,
  spentOnGas,
  getPlasmaContractAddress,
  getTimeToExit,
  setGas
}
