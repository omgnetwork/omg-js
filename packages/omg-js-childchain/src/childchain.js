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

const rpcApi = require('./rpc/rpcApi')
const rlp = require('rlp')
const { InvalidArgumentError, transaction, sign, hexPrefix } = require('@omisego/omg-js-util')
global.Buffer = global.Buffer || require('buffer').Buffer

class ChildChain {
  /**
  * Creates a ChildChain object
  *
  *@param {string} watcherUrl the url of the watcher server
  *@param {string} [watcherProxyUrl] *optional* the proxy url for requests made to the watcher server
  *@return {Object} ChildChain Object
  *
  */
  constructor ({ watcherUrl, watcherProxyUrl }) {
    this.watcherUrl = watcherUrl
    this.watcherProxyUrl = watcherProxyUrl
  }

  /**
   * Gets the UTXOs of an address (includes both spent and unspent UTXOs)
   *
   * @method getUtxos
   * @param {string} address
   * @return {Array} array of UTXOs
   */
  async getUtxos (address) {
    validateAddress(address)
    return rpcApi.post({
      url: `${this.watcherUrl}/account.get_utxos`,
      body: { address },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Gets the exitable UTXOs of an address
   *
   * @method getExitableUtxos
   * @param {string} address
   * @return {Array} array of UTXOs
   */
  async getExitableUtxos (address) {
    validateAddress(address)
    return rpcApi.post({
      url: `${this.watcherUrl}/account.get_exitable_utxos`,
      body: { address },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the balance of an address
   *
   * @method getBalance
   * @param {string} address
   * @return {Array} array of balances (one per currency)
   */
  async getBalance (address) {
    validateAddress(address)
    return rpcApi.post({
      url: `${this.watcherUrl}/account.get_balance`,
      body: { address },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get a transaction
   *
   * @method getTransaction
   * @param {object} id The hash of the transaction to get
   * @return {Array} array of transactions
   */
  async getTransaction (id) {
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.get`,
      body: { id },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get transactions
   *
   * @method getTransactions
   * @param {object} filters Filter the results by `address`, `blknum` and `limit`
   * @return {Array} array of transactions
   */
  async getTransactions (filters) {
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.all`,
      body: filters,
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the exit data for a UTXO
   *
   * @method getExitData
   * @param {Object} utxo
   * @return {string} exit data for the UTXO
   */
  async getExitData (utxo) {
    // Calculate the utxoPos
    const utxoPos = transaction.encodeUtxoPos(utxo)
    return rpcApi.post({
      url: `${this.watcherUrl}/utxo.get_exit_data`,
      body: { utxo_pos: Number(utxoPos.toString()) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the challenge data for a UTXO
   *
   * @method getChallengeData
   * @param {Object} utxo
   * @return {string} challenge data for the UTXO
   */
  async getChallengeData (utxoPos) {
    return rpcApi.post({
      url: `${this.watcherUrl}/utxo.get_challenge_data`,
      body: { utxo_pos: Number(utxoPos.toString()) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Given currency, amount and spender, finds spender's inputs sufficient to perform a payment. If also provided with receiver's address, creates and encodes a transaction
   *
   * @method createTransaction
   * @param {string} owner
   * @param {Array} payments
   * @param {Object} fee
   * @param {string} metadata
   * @return {Object} a object containing the list of transactions that will fullfil the required spend.
   */
  createTransaction (owner, payments, fee, metadata) {
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.create`,
      body: { owner, payments, fee, metadata },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Signs the transaction's typed data that is returned from `createTransaction`
   *
   * @method signTypedData
   * @param {Object} txData the transaction data that is returned from `createTransaction`
   * @param {Array} privateKeys An array of private keys to sign the inputs of the transaction
   * @return {Object} a transaction typed data, including the signatures. This can be passed in to `submitTyped`
   */
  signTypedData (txData, privateKeys) {
    // Sign the transaction
    const toSign = Buffer.from(txData.sign_hash.replace('0x', ''), 'hex')
    txData.typed_data.signatures = sign(toSign, privateKeys)

    return txData.typed_data
  }

  /**
   * Submits a transaction along with its typed data and signatures to the watcher.
   *
   * @method submitTyped
   * @param {Object} data can be obtained by calling `signTypedData`
   * @return {Object} a transaction
   */
  submitTyped (data) {
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.submit_typed`,
      body: data,
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Sign a transaction
   *
   * @method signTransaction
   * @param {string} typedData The typedData of the transaction, as returned by transaction.getTypedData()
   * @param {Array} privateKeys An array of private keys to sign the inputs of the transaction
   * @return {Array} array of signatures
   */
  signTransaction (typedData, privateKeys) {
    const toSign = transaction.getToSignHash(typedData)
    return sign(toSign, privateKeys)
  }

  /**
   * Build a signed transaction into the format expected by submitTransaction
   *
   * @method buildSignedTransaction
   * @param {string} txData The typedData of the transaction, as returned by transaction.getTypedData
   * @param {Array} signatures An array of signatures, one for each input spent by the transaction
   * @return {string} signed transaction
   */
  buildSignedTransaction (txData, signatures) {
    // Convert the data to an array
    const txArray = transaction.toArray(txData.message)
    // Prepend the signatures
    const signedTx = [signatures, txData.message.txType, ...txArray]
    // rlp-encode the transaction + signatures
    return hexPrefix(rlp.encode(signedTx).toString('hex'))
  }

  /**
   * Submit a signed transaction to the watcher
   *
   * @method submitTransaction
   * @param {string} transaction the encoded signed transaction, as returned by buildSignedTransaction
   * @return {Object} the submitted transaction
   */
  async submitTransaction (transaction) {
    // validateTxBody(transactionBody)
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.submit`,
      body: { transaction: transaction.startsWith('0x') ? transaction : `0x${transaction}` },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * create, sign, build and submit a transaction to the childchain using raw privatekey
   *
   * @method sendTransaction
   * @param {Array} fromAddress - the address of the sender
   * @param {Array} fromUtxos - array of utxos to spend
   * @param {Array} fromPrivateKeys - private keys of the utxos to spend
   * @param {string} toAddress - the address of the recipient
   * @param {number} toAmount - amount to transact
   * @param {string} currency - address of the erc20 contract (or transaction.ETH_CURRENCY for ETH)
   * @param {string} metadata - the metadata to include in the transaction. Must be a 32-byte hex string
   * @param {string} verifyingContract - address of the RootChain contract
   * @return {Object} the submitted transaction
   */
  async sendTransaction (
    fromAddress,
    fromUtxos,
    fromPrivateKeys,
    toAddress,
    toAmount,
    currency,
    metadata,
    verifyingContract
  ) {
    validateAddress(fromAddress)
    validateAddress(toAddress)
    validatePrivateKey(fromPrivateKeys)

    // create the transaction body
    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toAmount,
      currency,
      metadata
    )
    const typedData = transaction.getTypedData(txBody, verifyingContract)
    // Sign it
    const signatures = this.signTransaction(typedData, fromPrivateKeys)
    // Build the signed transaction
    const signedTx = this.buildSignedTransaction(typedData, signatures)
    // submit transaction
    return this.submitTransaction(signedTx)
  }

  /**
   * Returns the current status of the Watcher.
   * Should be called periodically to see if there are any byzantine_events to be acted on.
   *
   * @method status
   * @return {Object}
   */
  async status () {
    return rpcApi.post({
      url: `${this.watcherUrl}/status.get`,
      body: {},
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Gets the data to challenge an invalid input piggybacked on an in-flight exit.
   *
   * @method inFlightExitGetInputChallengeData
   * @param {string} txbytes the hex-encoded transaction
   * @param {number} inputIndex invalid input index
   * @return {Object} input challenge data for the in-flight transaction
   */
  async inFlightExitGetInputChallengeData (txbytes, inputIndex) {
    return rpcApi.post({
      url: `${this.watcherUrl}/in_flight_exit.get_input_challenge_data`,
      body: {
        txbytes: hexPrefix(txbytes),
        input_index: inputIndex
      },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Gets the data to challenge an invalid output piggybacked on an in-flight exit.
   *
   * @method inFlightExitGetOutputChallengeData
   * @param {string} txbytes the hex-encoded transaction
   * @param {number} outputIndex invalid output index
   * @return {Object} input challenge data for the in-flight transaction
   */
  async inFlightExitGetOutputChallengeData (txbytes, outputIndex) {
    return rpcApi.post({
      url: `${this.watcherUrl}/in_flight_exit.get_output_challenge_data`,
      body: {
        txbytes: hexPrefix(txbytes),
        input_index: outputIndex
      },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the exit data for an in-flight transaction
   *
   * @method inFlightExitGetData
   * @param {string} txbytes the hex-encoded transaction
   * @return {Object} exit data for the in-flight transaction
   */
  async inFlightExitGetData (txbytes) {
    return rpcApi.post({
      url: `${this.watcherUrl}/in_flight_exit.get_data`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get a competitor for an in-flight transaction
   *
   * @method inFlightExitGetCompetitor
   * @param {string} txbytes the hex-encoded transaction
   * @return {Object} a competitor to the in-flight transaction
   */
  async inFlightExitGetCompetitor (txbytes) {
    return rpcApi.post({
      url: `${this.watcherUrl}/in_flight_exit.get_competitor`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Proves that a transaction has been put into a block (and therefore is canonical).
   *
   * @method inFlightExitProveCanonical
   * @param {string} txbytes the hex-encoded transaction
   * @return {Object} the inclusion proof of the transaction
   */
  async inFlightExitProveCanonical (txbytes) {
    return rpcApi.post({
      url: `${this.watcherUrl}/in_flight_exit.prove_canonical`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }
}

function validatePrivateKey (arg) {
  // TODO
  const valid = true
  if (!valid) {
    throw new InvalidArgumentError()
  }
}

function validateAddress (arg) {
  // TODO
  const valid = true
  if (!valid) {
    throw new InvalidArgumentError()
  }
}

module.exports = ChildChain
