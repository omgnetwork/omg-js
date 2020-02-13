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
const { transaction, hexPrefix } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const Childchain = require('@omisego/omg-js-childchain')
const config = require('../test-config')

async function selectUtxos (utxos, amount, currency) {
  // Filter by desired currency and sort in descending order
  const childChain = new Childchain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  const fees = (await childChain.getFeesInfo())['1']
  const { amount: feeEthAmountWei } = fees.find(f => f.currency === transaction.ETH_CURRENCY)

  const sorted = utxos
    .filter(utxo => utxo.currency.toLowerCase() === currency.toLowerCase())
    .sort((a, b) => numberToBN(b.amount).sub(numberToBN(a.amount)))

  if (sorted) {
    const selected = []
    const currentBalance = numberToBN(0)
    for (let i = 0; i < Math.min(sorted.length, 4); i++) {
      selected.push(sorted[i])
      currentBalance.iadd(numberToBN(sorted[i].amount))
      const expectedTotalIncludeFee = numberToBN(amount).add(numberToBN(feeEthAmountWei))
      if (currency === transaction.ETH_CURRENCY && currentBalance.gte(expectedTotalIncludeFee)) {
        break
      } else if (currentBalance.gte(numberToBN(amount))) {
        break
      }
    }
    if (currency !== transaction.ETH_CURRENCY) {
      const ethUtxos = utxos.find(
        utxo => utxo.currency.toLowerCase() === transaction.ETH_CURRENCY.toLowerCase()
      )
      selected.push(ethUtxos)
    }
    return selected
  }
}

function waitForBalance (childChain, address, currency, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for childchain balance...  (${number})`)
    const resp = await childChain.getBalance(address)
    if (resp.length === 0) retry()
    const currencyExists = resp.find(item => item.currency.toLowerCase() === currency.toLowerCase())
    if (!currencyExists) retry()

    if (callback) {
      const callbackPassed = callback(currencyExists)
      if (!callbackPassed) retry()
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

async function sendAndWait (childChain, from, to, amount, currency, privateKey, expectedBalance, verifyingContract) {
  const ret = await send(childChain, from, to, amount, currency, privateKey, verifyingContract)
  await waitForBalanceEq(childChain, to, expectedBalance, currency)
  return ret
}

async function createTx (childChain, from, to, amount, currency, fromPrivateKey, verifyingContract) {
  if (amount <= 0) {
    return
  }

  const utxos = await childChain.getUtxos(from)
  const utxosToSpend = await selectUtxos(utxos, amount, currency, true)
  if (!utxosToSpend || utxosToSpend.length === 0) {
    throw new Error(`Not enough funds in ${from} to cover ${amount} ${currency}`)
  }

  // Construct the tx body
  const txBody = {
    inputs: utxosToSpend,
    outputs: [{
      outputType: 1,
      outputGuard: to,
      currency,
      amount
    }]
  }

  const fees = (await childChain.getFeesInfo())['1']
  const { amount: feeEthAmountWei } = fees.find(f => f.currency === transaction.ETH_CURRENCY)

  const utxoAmount = numberToBN(utxosToSpend.find(utxo => utxo.currency === currency).amount)
  const utxoEthAmount = numberToBN(utxosToSpend.find(utxo => utxo.currency === transaction.ETH_CURRENCY).amount)
  const isEthCurrency = currency === transaction.ETH_CURRENCY

  if (!isEthCurrency) {
    // Need to add a 'change' output
    if (utxoAmount.gt(numberToBN(amount))) {
      const CHANGE_AMOUNT = utxoAmount.sub(numberToBN(amount))
      txBody.outputs.push({
        outputType: 1,
        outputGuard: from,
        currency,
        amount: CHANGE_AMOUNT
      })
    }

    const CHANGE_AMOUNT_FEE = utxoEthAmount.sub(numberToBN(feeEthAmountWei))

    txBody.outputs.push({
      outputType: 1,
      outputGuard: from,
      currency: transaction.ETH_CURRENCY,
      amount: CHANGE_AMOUNT_FEE
    })
  } else {
    if (utxoAmount.gt(numberToBN(amount).add(numberToBN(feeEthAmountWei)))) {
      const CHANGE_AMOUNT = utxoAmount.sub(numberToBN(amount)).sub(numberToBN(feeEthAmountWei))
      txBody.outputs.push({
        outputType: 1,
        outputGuard: from,
        currency: transaction.ETH_CURRENCY,
        amount: CHANGE_AMOUNT
      })
    }
  }

  const privateKeys = new Array(utxosToSpend.length).fill(fromPrivateKey)
  const typedData = transaction.getTypedData(txBody, verifyingContract)
  const signatures = childChain.signTransaction(typedData, privateKeys)

  return childChain.buildSignedTransaction(typedData, signatures)
}

async function send (childChain, from, to, amount, currency, fromPrivateKey, verifyingContract) {
  const signedTx = await createTx(childChain, from, to, amount, currency, fromPrivateKey, verifyingContract)
  // Submit the signed transaction to the childchain
  const result = await childChain.submitTransaction(signedTx)
  return { result, txbytes: hexPrefix(signedTx) }
}

async function splitUtxo (childChain, verifyingContract, account, utxo, split) {
  console.log(`Splitting utxo ${transaction.encodeUtxoPos(utxo)}`)

  const txBody = {
    inputs: [utxo],
    outputs: []
  }
  const div = Math.floor(utxo.amount / split)
  txBody.outputs = new Array(split).fill().map(x => ({
    owner: account.address,
    currency: transaction.ETH_CURRENCY,
    amount: div
  }))

  // Create the unsigned transaction
  const typedData = transaction.getTypedData(txBody, verifyingContract)

  // Sign it
  const signatures = childChain.signTransaction(typedData, [account.privateKey])
  // Build the signed transaction
  const signedTx = childChain.buildSignedTransaction(typedData, signatures)
  return childChain.submitTransaction(signedTx)
}

function waitNumUtxos (childChain, address, num) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for utxos...  (${number})`)
    const utxos = await childChain.getUtxos(address)
    if (utxos.length !== num) {
      retry()
    }
  }, {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  })
}

module.exports = {
  waitForBalance,
  waitForBalanceEq,
  send,
  createTx,
  sendAndWait,
  waitForEvent,
  selectUtxos,
  splitUtxo,
  waitNumUtxos
}
