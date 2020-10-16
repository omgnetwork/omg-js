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

import Web3 from 'web3';
import promiseRetry from 'promise-retry';
import BN from 'bn.js';

import OmgJS from '../..';

import config from '../test-config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

export async function selectUtxos (utxos, amount, currency) {
  // Filter by desired currency and sort in descending order
  const fees = (await omgjs.getFees())['1']
  const { amount: feeEthAmountWei } = fees.find(f => f.currency === OmgJS.currency.ETH)

  const sorted = utxos
    .filter(utxo => utxo.currency.toLowerCase() === currency.toLowerCase())
    .sort((a, b) => new BN(b.amount).sub(new BN(a.amount)))

  if (sorted) {
    const selected = []
    const currentBalance = new BN(0)
    for (let i = 0; i < Math.min(sorted.length, 4); i++) {
      selected.push(sorted[i])
      currentBalance.iadd(new BN(sorted[i].amount))
      const expectedTotalIncludeFee = new BN(amount).add(new BN(feeEthAmountWei))
      if (currency === OmgJS.currency.ETH && currentBalance.gte(expectedTotalIncludeFee)) {
        break
      } else if (currentBalance.gte(new BN(amount))) {
        break
      }
    }
    if (currency !== OmgJS.currency.ETH) {
      const ethUtxos = utxos.find(
        utxo => utxo.currency.toLowerCase() === OmgJS.currency.ETH.toLowerCase()
      )
      selected.push(ethUtxos)
    }
    return selected
  }
}

export function waitForBalance (address, currency, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for childchain balance...  (${number})`)
    const resp = await omgjs.getBalance(address)
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

export function waitForBalanceEq (address: string, expectedAmount: number | string, currency?: string) {
  currency = currency || OmgJS.currency.ETH
  const expectedBn = new BN(expectedAmount.toString())
  return waitForBalance(address, currency, balance => new BN(balance.amount).eq(expectedBn))
}

export function waitForEvent (type, callback) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for event...  (${number})`)
    const status = await omgjs.getStatus()
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

export async function sendAndWait (from, to, amount, currency, privateKey, expectedBalance) {
  const ret = await send(from, to, amount, currency, privateKey)
  await waitForBalanceEq(to, expectedBalance, currency)
  return ret
}

export async function createTx (from, to, amount, currency, fromPrivateKey) {
  if (amount <= 0) {
    return
  }

  const utxos = await omgjs.getUtxos(from)
  const utxosToSpend = await selectUtxos(utxos, amount, currency)
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

  const fees = (await omgjs.getFees())['1']
  const { amount: feeEthAmountWei } = fees.find(f => f.currency === OmgJS.currency.ETH)

  const utxoAmount = new BN(utxosToSpend.find(utxo => utxo.currency.toLowerCase() === currency.toLowerCase()).amount)
  const utxoEthAmount = new BN(utxosToSpend.find(utxo => utxo.currency === OmgJS.currency.ETH).amount)
  const isEthCurrency = currency === OmgJS.currency.ETH

  if (!isEthCurrency) {
    // Need to add a 'change' output
    if (utxoAmount.gt(new BN(amount))) {
      const CHANGE_AMOUNT = utxoAmount.sub(new BN(amount))
      txBody.outputs.push({
        outputType: 1,
        outputGuard: from,
        currency,
        amount: CHANGE_AMOUNT
      })
    }

    const CHANGE_AMOUNT_FEE = utxoEthAmount.sub(new BN(feeEthAmountWei))

    txBody.outputs.push({
      outputType: 1,
      outputGuard: from,
      currency: OmgJS.currency.ETH,
      amount: CHANGE_AMOUNT_FEE
    })
  } else {
    const totalDeduct = new BN(amount).add(new BN(feeEthAmountWei))
    if (utxoAmount.gt(totalDeduct)) {
      const CHANGE_AMOUNT = utxoAmount.sub(new BN(amount)).sub(new BN(feeEthAmountWei))
      txBody.outputs.push({
        outputType: 1,
        outputGuard: from,
        currency: OmgJS.currency.ETH,
        amount: CHANGE_AMOUNT
      })
    }
  }

  const privateKeys = new Array(utxosToSpend.length).fill(fromPrivateKey)
  const typedData = omgjs.getTypedData(txBody)
  const signatures = omgjs.signTransaction({ typedData, privateKeys })
  return omgjs.buildSignedTransaction({ typedData, signatures })
}

export async function send (from, to, amount, currency, fromPrivateKey) {
  const signedTx = await createTx(from, to, amount, currency, fromPrivateKey)
  // Submit the signed transaction to the childchain
  const result = await omgjs.submitTransaction(signedTx)
  return { result, txbytes: OmgJS.util.prefixHex(signedTx) }
}

// works only with ETH for now
export async function splitUtxo (account, utxo, split) {
  console.log(`Splitting utxo ${omgjs.encodeUtxoPos(utxo).toString()}`)
  const fees = (await omgjs.getFees())['1']
  const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH)
  const txBody = {
    inputs: [utxo],
    outputs: []
  }
  const div = Math.floor(utxo.amount / split)
  txBody.outputs = new Array(split).fill('x').map((x, i) => ({
    owner: account.address,
    currency: OmgJS.currency.ETH,
    amount: i === 0 ? div - amount : div // need to deduct eth fee
  }))

  // Create the unsigned transaction
  const typedData = omgjs.getTypedData(txBody)

  // Sign it
  const signatures = omgjs.signTransaction({ typedData, privateKeys: [account.privateKey] })
  // Build the signed transaction
  const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
  return omgjs.submitTransaction(signedTx)
}

export function waitNumUtxos (address, num) {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for utxos...  (${number})`)
    const utxos = await omgjs.getUtxos(address)
    if (utxos.length !== num) {
      retry()
    }
  }, {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  })
}
