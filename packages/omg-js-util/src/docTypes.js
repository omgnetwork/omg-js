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

// A collection of custom types used for documentation with JSDoc

/**
 * A Web3 instance object
 * @typedef {Object} Web3
 */

/**
 * An Ethereum transaction receipt
 * @typedef {Object} TransactionReceipt
 * @property {string} blockHash
 * @property {number} blockNumber
 * @property {string} contractAddress
 * @property {number} cumulativeGasUsed
 * @property {string} from
 * @property {number} gasUsed
 * @property {Object[]} logs
 * @property {string} root
 * @property {string} to
 * @property {string} transactionHash
 * @property {number} transactionIndex
 */

/**
 * UTXO
 * @typedef {Object} UTXO
 * @property {number} txindex
 * @property {number} oindex
 * @property {number} blknum
 */

/**
 * Decoded output
 * @typedef {Object} Output
 * @property {number} outputType
 * @property {string} outputGuard
 * @property {string} currency
 * @property {number} amount
 */

/**
 * A transaction body object
 * @typedef {Object} TransactionBody
 * @property {number} transactionType
 * @property {UTXO[]} inputs
 * @property {Output[]} outputs
 * @property {string} metadata
 */

/**
 * A deposit transaction object
 * @typedef {Object} DepositTransaction
 * @property {string} owner
 * @property {number} amount
 * @property {string} currency
 */

/**
 * A BigNumber object
 * @typedef {Object} BigNumber
 * @property {Function} toString
 * @property {Function} toNumber
 */

/**
 * A typed data object
 * @typedef {Object} TypedData
 * @property {Object} types
 * @property {Object} domain
 * @property {string} primaryType
 * @property {Object} message
 */

/**
 * A transaction options object
 * @typedef {Object} TransactionOptions
 * @property {string} from
 * @property {number} gas
 * @property {string} gasPrice
 * @property {string} privateKey
 */

/**
 * Transaction life cycle event callbacks
 * @typedef {Object} TransactionCallbacks
 * @property {Function} onConfirmation
 * @property {Function} onReceipt
 */
