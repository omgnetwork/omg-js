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
const numberToBN = require('number-to-bn')
const transaction = require('./transaction')

function waitForChildchainBalance ({
  childChain,
  address,
  expectedAmount,
  currency = transaction.ETH_CURRENCY
}) {
  return promiseRetry(async (retry, number) => {
    const resp = await childChain.getBalance(address)
    if (resp.length === 0) retry()

    const currencyExists = resp.find(item => item.currency.toLowerCase() === currency.toLowerCase())
    if (!currencyExists) retry()

    const expectedBn = numberToBN(expectedAmount)
    const isEqual = numberToBN(currencyExists.amount).eq(expectedBn)
    if (!isEqual) retry()

    return resp
  }, {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  })
}

module.exports = waitForChildchainBalance
