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
const ethUtil = require('ethereumjs-util')

function selectUtxos (utxos, amount, currency, includeFee) {
  // Filter by desired currency and sort in descending order
  const sorted = utxos
    .filter(utxo => utxo.currency.toLowerCase() === currency.toLowerCase())
    .sort((a, b) => numberToBN(b.amount).sub(numberToBN(a.amount)))

  if (sorted) {
    const selected = []
    const currentBalance = numberToBN(0)
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
          utxo => utxo.currency.toLowerCase() === transaction.ETH_CURRENCY.toLowerCase()
        )
        const feeUtxo = ethUtxos.find(utxo => utxo !== selected)
        if (!feeUtxo) {
          console.warn('Can\'t find a fee utxo, transaction may fail!')
        } else {
          selected.push(feeUtxo)
        }
      }
      return selected
    }
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
  const transferZeroFee = currency !== transaction.ETH_CURRENCY
  const utxosToSpend = selectUtxos(utxos, amount, currency, transferZeroFee)
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

  const utxoAmount = utxosToSpend[0].amount
  if (utxoAmount > amount) {
    // Need to add a 'change' output
    const CHANGE_AMOUNT = utxoAmount - amount
    txBody.outputs.push({
      outputType: 1,
      outputGuard: from,
      currency,
      amount: CHANGE_AMOUNT
    })
  }

  if (this.transferZeroFee && utxosToSpend.length > 1) {
    // The fee input can be returned
    txBody.outputs.push({
      outputType: 1,
      outputGuard: from,
      currency: utxosToSpend[utxosToSpend.length - 1].currency,
      amount: utxosToSpend[utxosToSpend.length - 1].amount
    })
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
  return { result, txbytes: signedTx }
}

function checkSig (web3, tx, sig, address) {
  // Split the sig
  const r = sig.slice(0, 66)
  const s = `0x${sig.slice(66, 130)}`
  const v = web3.utils.toDecimal(`0x${sig.slice(130, 132)}`)

  const hashed = web3.utils.sha3(tx)
  const signer = ethUtil.ecrecover(ethUtil.toBuffer(hashed), v, r, s)
  const signerAddress = `0x${ethUtil.pubToAddress(signer).toString('hex')}`
  if (signerAddress !== address) {
    throw new Error(`Signer ${signerAddress} does not match address ${address}`)
  }
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
  checkSig,
  splitUtxo,
  waitNumUtxos
}
