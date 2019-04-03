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
  const sorted = utxos
    .filter(utxo => utxo.currency === currency)
    .sort((a, b) => numberToBN(b.amount).sub(numberToBN(a.amount)))

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
    if (
      resp.length === 0 ||
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

function waitForEvent (childChain, type, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for event...  (${number})`)
    const status = await childChain.status()
    if (status[type]) {
      const found = status[type].find(callback)
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

async function sendAndWait (childChain, from, to, amount, currency, privateKey, expectedBalance) {
  const ret = await send(childChain, from, to, amount, currency, privateKey)
  await waitForBalanceEq(childChain, to, expectedBalance, currency)
  return ret
}

async function send (childChain, from, to, amount, currency, fromPrivateKey) {
  if (amount <= 0) {
    return
  }

  const utxos = await childChain.getUtxos(from)
  const transferZeroFee = currency !== transaction.ETH_CURRENCY
  const utxosToSpend = selectUtxos(utxos, amount, currency, transferZeroFee)
  if (!utxosToSpend || utxosToSpend.length === 0) {
    throw new Error(`Not enough funds in ${from} to cover ${amount} ${currency}`)
  }

  // Construct the tx body
  const txBody = {
    inputs: utxosToSpend,
    outputs: [{
      owner: to,
      currency,
      amount
    }]
  }

  const bnAmount = numberToBN(utxosToSpend[0].amount)
  if (bnAmount.gt(numberToBN(amount))) {
    // Need to add a 'change' output
    const CHANGE_AMOUNT = bnAmount.sub(numberToBN(amount))
    txBody.outputs.push({
      owner: from,
      currency,
      amount: CHANGE_AMOUNT
    })
  }

  if (this.transferZeroFee && utxosToSpend.length > 1) {
    // The fee input can be returned
    txBody.outputs.push({
      owner: this.address,
      currency: utxosToSpend[utxosToSpend.length - 1].currency,
      amount: utxosToSpend[utxosToSpend.length - 1].amount
    })
  }

  // Create the unsigned transaction
  const unsignedTx = await childChain.createTransaction(txBody)
  // Sign it
  const privateKeys = new Array(utxosToSpend.length).fill(fromPrivateKey)
  const signatures = await childChain.signTransaction(unsignedTx, privateKeys)
  // Build the signed transaction
  const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
  // Submit the signed transaction to the childchain
  const result = await childChain.submitTransaction(signedTx)
  return { result, txbytes: signedTx }
}

module.exports = {
  waitForBalance,
  waitForBalanceEq,
  send,
  sendAndWait,
  waitForEvent,
  selectUtxos
}
