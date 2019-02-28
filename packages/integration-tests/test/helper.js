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
const fetch = require('node-fetch')

function createAccount (web3) {
  const ret = web3.eth.accounts.create()
  ret.address = ret.address.toLowerCase()
  return ret
}

async function fundAccount (web3, config, address, value) {
  if (value <= 0) {
    return
  }

  let fundAccount
  if (config.fundAccount && config.fundAccount !== '') {
    fundAccount = config.fundAccountAddress
  } else {
    // Default to using eth.accounts[0]
    const accounts = await web3.eth.getAccounts()
    fundAccount = accounts[0]
  }

  // First check if a private key has been set. If so, use it.
  if (config.fundAccountPrivateKey && config.fundAccountPrivateKey !== '') {
    const txDetails = {
      from: fundAccount,
      to: address,
      value
    }
    // First sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, config.fundAccountPrivateKey)
    // Then send it
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }

  // Otherwise, try with a password.
  const unlocked = await web3.eth.personal.unlockAccount(fundAccount, config.fundAccountPassword)
  if (unlocked) {
    return web3.eth.sendTransaction({
      from: fundAccount,
      to: address,
      value
    })
  }

  throw new Error(`Funding account ${fundAccount} password or private key not set`)
}

async function createAndFundAccount (web3, config, value) {
  const account = createAccount(web3)
  await fundAccount(web3, config, account.address, value)
  await waitForEthBalance(web3, account.address, value)
  return account
}

async function fundAccountERC20 (web3, erc20Contract, fundAccount, fundAccountPassword, toAccount, value) {
  await web3.eth.personal.unlockAccount(fundAccount, fundAccountPassword)
  return erc20Contract.methods.transfer(toAccount, value).send({
    from: fundAccount,
    gas: 2000000
  })
}

async function approveERC20 (web3,
  erc20Contract,
  ownerAccount,
  ownerAccountPassword,
  spender,
  value
) {
  const txDetails = {
    from: ownerAccount,
    to: erc20Contract._address,
    data: erc20Contract.methods.approve(spender, value).encodeABI(),
    gas: 2000000
  }

  return sendTx(web3.eth, txDetails, ownerAccountPassword)
}

async function sendTx (eth, txDetails, privateKey) {
  if (!privateKey) {
    // No privateKey to sign with, assume sending from an unlocked geth account
    return eth.sendTransaction(txDetails)
  } else {
    // First sign the transaction
    const signedTx = await eth.accounts.signTransaction(txDetails, privateKey)
    // Then send it
    return eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

async function createAndFundManyAccounts (web3, config, initialAmounts) {
  return Promise.all(initialAmounts.map(amount => createAndFundAccount(web3, config, amount)))
}

function waitForBalance (childChain, address, expectedBalance, currency) {
  currency = currency || transaction.ETH_CURRENCY
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for balance...  (${number})`)
    const resp = await childChain.getBalance(address)
    if (resp.length === 0 || !resp.find(item => {
      return item.amount.toString() === expectedBalance.toString() && item.currency === currency
    })) {
      retry()
    }
    return resp
  }, {
    minTimeout: 2000,
    factor: 1
  })
}

function waitForEthBalance (web3, address, expectedBalance) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ETH balance...  (${number})`)
    const resp = await web3.eth.getBalance(address)
    if (resp.toString() !== expectedBalance.toString()) {
      retry()
    }
    return resp
  }, {
    minTimeout: 2000,
    factor: 1
  })
}

function waitForEvent (childChain, eventName) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ${eventName} event...  (${number})`)
    const status = await childChain.status()
    if (status.byzantine_events) {
      const found = status.byzantine_events.find(e => e.event === eventName)
      if (found) {
        return found
      }
    }
    retry()
  }, {
    minTimeout: 2000,
    factor: 1
  })
}

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function sendAndWait (childChain, from, to, amount, currency, privateKeys, expectedBalance) {
  await send(childChain, from, to, amount, currency, privateKeys)
  return waitForBalance(childChain, to, expectedBalance)
}

async function send (childChain, from, to, amount, currency, privateKeys) {
  // Get 'from' account's utxos
  const utxos = await childChain.getUtxos(from)

  // TODO For now assume that one utxo can cover the amount to be sent

  // Convert 'amount' to a Number
  utxos[0].amount = Number(utxos[0].amount)

  if (utxos[0].amount < amount) {
    throw new Error(`utxo amount ${utxos[0].amount} is not enough to send ${amount}`)
  }

  // Construct the tx body
  const txBody = {
    inputs: [utxos[0]],
    outputs: [{
      owner: to,
      currency,
      amount
    }, {
      owner: from,
      currency,
      amount: utxos[0].amount - amount
    }]
  }

  // Create the unsigned transaction
  const unsignedTx = await childChain.createTransaction(txBody)
  // Sign it
  const signatures = await childChain.signTransaction(unsignedTx, privateKeys)
  // Build the signed transaction
  const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
  // Submit the signed transaction to the childchain
  return childChain.submitTransaction(signedTx)
}

async function depositEthAndWait (rootChain, childChain, address, amount, privateKey, expectedBalance) {
  const depositTx = transaction.encodeDeposit(address, amount, transaction.ETH_CURRENCY)
  const receipt = await rootChain.depositEth(depositTx, amount, { from: address, privateKey: privateKey })
  // Wait for transaction to be mined
  await waitForBalance(childChain, address, expectedBalance || amount)
  return receipt
}

async function spentOnGas (web3, receipt) {
  const tx = await web3.eth.getTransaction(receipt.transactionHash)
  return web3.utils.toBN(tx.gasPrice).muln(receipt.gasUsed)
}

async function getPlasmaContractAddress (config) {
  if (config.rootchainContract && config.rootchainContract !== '') {
    return config.rootchainContract
  } else if (config.contract_exchanger_url && config.contract_exchanger_url !== '') {
    const repsonse = await fetch(config.contract_exchanger_url)
    return repsonse.json()
  }

  throw new Error('No ROOTCHAIN_CONTRACT or CONTRACT_EXCHANGER_URL configured')
}

async function getTimeToExit (plasmaContract, output) {
  const exitableAt = await plasmaContract.methods.getExitableTimestamp(output).call()
  return (Number(exitableAt) - Math.trunc(Date.now() / 1000)) * 1000
}

async function returnFunds (web3, config, fromAccount) {
  let fundAccount
  if (config.fundAccount && config.fundAccount !== '') {
    fundAccount = config.fundAccountAddress
  } else {
    // Default to using eth.accounts[0]
    const accounts = await web3.eth.getAccounts()
    fundAccount = accounts[0]
  }

  const txDetails = {
    from: fromAccount.address,
    to: fundAccount
  }

  const gas = await web3.eth.estimateGas(txDetails)
  const gasPrice = await web3.eth.getGasPrice()

  txDetails.gas = gas
  txDetails.gasPrice = gasPrice

  const balance = await web3.eth.getBalance(fromAccount.address)
  const gasUsed = web3.utils.toBN(gas).mul(web3.utils.toBN(gasPrice))
  if (Number(gasUsed.toString()) > 0) {
    txDetails.value = (web3.utils.toBN(balance).sub(gasUsed)).toString()

    // First sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, fromAccount.privateKey)
    // Then send it
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

module.exports = {
  createAccount,
  createAndFundAccount,
  createAndFundManyAccounts,
  waitForBalance,
  waitForEthBalance,
  sleep,
  send,
  sendAndWait,
  depositEthAndWait,
  fundAccountERC20,
  approveERC20,
  spentOnGas,
  waitForEvent,
  getPlasmaContractAddress,
  getTimeToExit,
  returnFunds
}
