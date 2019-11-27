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
limitations under the License. */

const promiseRetry = require('promise-retry')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const fetch = require('node-fetch')
const erc20abi = require('human-standard-token-abi')
const { parseLog } = require('ethereum-event-logs')
const { utils } = require('web3')

function createAccount (web3) {
  const ret = web3.eth.accounts.create()
  ret.address = ret.address.toLowerCase()
  return ret
}

async function setGas (eth, txDetails) {
  if (!txDetails.gas) {
    try {
      txDetails.gas = await eth.estimateGas(txDetails)
    } catch (err) {
      throw new Error(`Error estimating gas: ${err}`)
    }
  }
  if (!txDetails.gasPrice) {
    try {
      txDetails.gasPrice = await eth.getGasPrice()
    } catch (err) {
      txDetails.gasPrice = '1000000000'
      console.warn('Error getting gas price: ', err)
    }
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
  return utils.toBN(tx.gasPrice).muln(receipt.gasUsed)
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

async function depositEth ({ rootChain, address, amount, privateKey }) {
  const depositTx = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
  return rootChain.depositEth({
    depositTx,
    amount,
    txOptions: { from: address, privateKey }
  })
}

async function depositToken ({ rootChain, address, amount, currency, privateKey }) {
  const depositTx = transaction.encodeDeposit(address, amount, currency)
  return rootChain.depositToken({
    depositTx,
    txOptions: { from: address, privateKey }
  })
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

async function getTimeToExit (plasmaContract, blockTimestamp) {
  // time to exit need to be caculate properly, this is just for testing assume * 2 min exit period
  const minExitPeriod = await plasmaContract.methods.minExitPeriod().call() * 1000
  return (Number(minExitPeriod) * 2)
}

const DEFAULT_INTERVAL = 1000
const DEFAULT_BLOCKS_TO_WAIT = 1

function awaitTx (web3, txnHash, options) {
  const interval = options && options.interval ? options.interval : DEFAULT_INTERVAL
  const blocksToWait = options && options.blocksToWait ? options.blocksToWait : DEFAULT_BLOCKS_TO_WAIT
  var transactionReceiptAsync = async function (txnHash, resolve, reject) {
    try {
      var receipt = await web3.eth.getTransactionReceipt(txnHash)
      if (!receipt) {
        setTimeout(function () {
          transactionReceiptAsync(txnHash, resolve, reject)
        }, interval)
      } else {
        if (blocksToWait > 0) {
          var resolvedReceipt = await receipt
          if (!resolvedReceipt || !resolvedReceipt.blockNumber) {
            setTimeout(function () {
              transactionReceiptAsync(txnHash, resolve, reject)
            }, interval)
          } else {
            try {
              var block = await web3.eth.getBlock(resolvedReceipt.blockNumber)
              var current = await web3.eth.getBlock('latest')
              if (current.number - block.number >= blocksToWait) {
                var txn = await web3.eth.getTransaction(txnHash)
                if (txn.blockNumber != null) {
                  resolve(resolvedReceipt)
                } else {
                  reject(new Error('Transaction with hash: ' + txnHash + ' ended up in an uncle block.'))
                }
              } else {
                setTimeout(function () {
                  transactionReceiptAsync(txnHash, resolve, reject)
                }, interval)
              }
            } catch (e) {
              setTimeout(function () {
                transactionReceiptAsync(txnHash, resolve, reject)
              }, interval)
            }
          }
        } else resolve(receipt)
      }
    } catch (e) {
      reject(e)
    }
  }

  if (Array.isArray(txnHash)) {
    var promises = []
    txnHash.forEach(function (oneTxHash) {
      promises.push(awaitTx(web3, oneTxHash, options))
    })
    return Promise.all(promises)
  } else {
    return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject)
    })
  }
}

function printlogs (receipt, abi) {
  const events = parseLog(receipt.logs, abi)
  events.forEach(e => console.log(`__ LOG__ ${e.name} : ${JSON.stringify(e.args)}`))
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
  setGas,
  awaitTx,
  printlogs
}
