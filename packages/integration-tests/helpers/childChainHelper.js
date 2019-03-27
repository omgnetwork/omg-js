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

function selectUtxos (utxos, amount, currency, includeFee) {
  // Filter by desired currency and sort in descending order
  const sorted = utxos.filter(utxo => utxo.currency === currency).sort((a, b) => numberToBN(b.amount).sub(numberToBN(a.amount)))

  if (sorted) {
    const selected = []
    let currentBalance = numberToBN(0)
    for (let i = 0; i < Math.min(sorted.length, 4); i++) {
      selected.push(sorted[i])
      currentBalance.iadd(numberToBN(sorted[i].amount))
      if (currentBalance.gte(numberToBN(amount))) {
        break
      }
    }

    if (currentBalance.gte(numberToBN(amount))) {
      if (includeFee) {
        // Find the first ETH utxo (that's not selected)
        const ethUtxos = utxos.filter(
          utxo => utxo.currency === transaction.ETH_CURRENCY
        )
        const feeUtxo = ethUtxos.find(utxo => utxo !== selected)
        selected.push(feeUtxo)
      }
      return selected
    }
  }
}

function waitForBalance (childChain, address, currency, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for childchain balance...  (${number})`)
    const resp = await childChain.getBalance(address)
    if (resp.length === 0 ||
      !resp.find(item => item.currency === currency && callback(item))
    ) {
      retry()
    }
    return resp
  }, {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  })
}

function waitForBalanceEq (childChain, address, expectedAmount, currency) {
  currency = currency || transaction.ETH_CURRENCY
  const expectedBn = numberToBN(expectedAmount)
  return waitForBalance(childChain, address, currency, balance => numberToBN(balance.amount).eq(expectedBn))
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
    minTimeout: 6000,
    factor: 1,
    retries: 50
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

module.exports = {
  waitForBalance,
  waitForBalanceEq,
  send,
  sendAndWait,
  waitForEvent,
  selectUtxos
}
