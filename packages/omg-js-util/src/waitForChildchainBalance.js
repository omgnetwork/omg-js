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
  limitations under the License.
*/

const promiseRetry = require('promise-retry')
const numberToBN = require('number-to-bn')
const transaction = require('./transaction')

/**
 * Helper that waits for a balance on the ChildChain to equal the expected amount
 *
 * @method waitForChildchainBalance
 * @param {Object} args arguments object
 * @param {ChildChain} args.childChain childchain instance
 * @param {string} args.address address to check the balance of
 * @param {number} args.expectedAmount the amount expected
 * @param {string} [args.currency] the token address to check (defaults to ETH)
 * @return {Promise<Object[]>} promise that resolves when the balance equals the expected amount
 */
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
