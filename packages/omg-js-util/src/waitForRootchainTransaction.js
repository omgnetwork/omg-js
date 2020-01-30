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

const { waitForRootchainTransactionSchema } = require('./validators')
const Joi = require('@hapi/joi')

/**
 * Helper that waits for RootChain confirmation of a transaction
 *
 * @method waitForRootchainTransaction
 * @param {Object} args arguments object
 * @param {Web3} args.web3 web3 instance
 * @param {string} args.transactionHash hash of the transaction to wait for
 * @param {number} args.checkIntervalMs interval in milliseconds to check the current block number
 * @param {number} args.blocksToWait number of blocks to wait before transaction is confirmed
 * @param {Function} [args.onCountdown] callback thats passed the remaining number of blocks before confirmation
 * @return {Promise<TransactionReceipt>} promise that resolves with the transaction receipt of the transaction
 */
async function waitForRootchainTransaction ({
  web3,
  transactionHash,
  checkIntervalMs,
  blocksToWait,
  onCountdown
}) {
  Joi.assert({ web3, transactionHash, checkIntervalMs, blocksToWait, onCountdown }, waitForRootchainTransactionSchema)
  let remaining
  const transactionReceiptAsync = async (transactionHash, resolve, reject) => {
    try {
      const transactionReceipt = await web3.eth.getTransactionReceipt(transactionHash)
      if (blocksToWait > 0) {
        try {
          const block = await web3.eth.getBlock(transactionReceipt.blockNumber)
          const current = await web3.eth.getBlock('latest')
          const remainingCandidate = blocksToWait - (current.number - block.number)
          if (remainingCandidate !== remaining) {
            remaining = remainingCandidate
            if (onCountdown) {
              onCountdown(remaining)
            }
          }
          if (current.number - block.number >= blocksToWait) {
            const transaction = await web3.eth.getTransaction(transactionHash)
            if (transaction.blockNumber !== null) {
              return resolve(transactionReceipt)
            } else {
              return reject(new Error('Transaction with hash: ' + transactionHash + ' ended up in an uncle block.'))
            }
          } else {
            setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), checkIntervalMs)
          }
        } catch (e) {
          setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), checkIntervalMs)
        }
      } else {
        return resolve(transactionReceipt)
      }
    } catch (e) {
      return reject(e)
    }
  }

  return new Promise((resolve, reject) => transactionReceiptAsync(transactionHash, resolve, reject))
}

module.exports = waitForRootchainTransaction
