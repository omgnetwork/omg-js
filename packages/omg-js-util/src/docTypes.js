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
 * @property {number} amount
 * @property {number} blknum
 * @property {string} creating_txhash
 * @property {string} currency
 * @property {number} oindex
 * @property {number} otype
 * @property {string} owner
 * @property {string} spending_txhash
 * @property {number} txindex
 * @property {number} utxo_pos
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
 * A transaction object returned from the Watcher
 * @typedef {Object} TransactionData
 * @property {number} txindex
 * @property {string} txhash
 * @property {string} metadata
 * @property {string} txbytes
 * @property {Object} block
 * @property {Object[]} inputs
 * @property {Object[]} outputs
 */

/**
 * A transaction body object
 * @typedef {Object} TransactionBody
 * @property {number} txType
 * @property {UTXO[]} inputs
 * @property {Output[]} outputs
 * @property {number} txData
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
 * A BN.js instance
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

/**
 * Balance returned from account.get_balance
 * @typedef {Object} Balance
 * @property {string|number|BigNumber} amount
 * @property {string} currency
 */

/**
 * Exit data for UTXO
 * @typedef {Object} ExitData
 * @property {string} proof
 * @property {string} txbytes
 * @property {number} utxo_pos
 */

/**
 * Payment object used when sending or creating transactions
 * @typedef {Object} Payment
 * @property {string} owner
 * @property {string} currency
 * @property {string|number|BigNumber} amount
 */

/**
 * Fee object used when sending or creating transactions
 * @typedef {Object} Fee
 * @property {string} currency
 */

/**
  * Fees object information
  * @typedef {Object} FeeInfo
  * @property {number} amount
  * @property {string} currency
  * @property {number} pegged_amount
  * @property {string} pegged_currency
  * @property {number} pegged_subunit_to_unit
  * @property {number} subunit_to_unit
  * @property {string} updated_at
  */
