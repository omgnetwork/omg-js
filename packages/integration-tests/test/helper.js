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

function createAccount (web3) {
  const ret = web3.eth.accounts.create()
  ret.address = ret.address.toLowerCase()
  return ret
}

async function createAndFundAccount (web3, fundAccount, fundAccountPassword, value) {
  const account = createAccount(web3)

  await web3.eth.personal.unlockAccount(fundAccount, fundAccountPassword)
  await web3.eth.sendTransaction({
    from: fundAccount,
    to: account.address,
    value
  })

  return account
}

function waitForBalance (childChain, address, expectedBalance) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for balance...  (${number})`)
    const resp = await childChain.getBalance(address)
    if (resp.length === 0 || resp[0].amount.toString() !== expectedBalance.toString()) {
      retry()
    }
    return resp
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

async function sendAndWait (childChain, from, to, amount, privateKeys, expectedBalance) {
  await send(childChain, from, to, amount, privateKeys)
  return waitForBalance(childChain, to, expectedBalance)
}

async function send (childChain, from, to, amount, privateKeys) {
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
      amount
    }, {
      owner: from,
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

module.exports = {
  createAccount,
  createAndFundAccount,
  waitForBalance,
  sleep,
  send,
  sendAndWait
}
