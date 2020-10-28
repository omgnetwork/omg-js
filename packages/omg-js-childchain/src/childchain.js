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

const {
  childchainConstructorSchema,
  getUtxosSchema,
  getBalanceSchema,
  getTransactionsSchema,
  getTransactionSchema,
  getDepositsSchema,
  getExitDataSchema,
  getChallengeDataSchema,
  createTransactionSchema,
  signTypedDataSchema,
  submitTypedSchema,
  signTransactionSchema,
  buildSignedTransactionSchema,
  sendTransactionSchema,
  inFlightExitGetOutputChallengeDataSchema,
  inFlightExitGetInputChallengeDataSchema,
  submitTransactionSchema,
  mergeUtxosSchema
} = require('./validators')
const Joi = require('@hapi/joi')
const rpcApi = require('./rpc/rpcApi')
const rlp = require('rlp')
const { transaction, sign, hexPrefix, utxo } = require('@omisego/omg-js-util')
const BN = require('bn.js')
global.Buffer = global.Buffer || require('buffer').Buffer

class ChildChain {
  /**
  * Creates a ChildChain object
  *
  * @param {Object} config the childchain configuration object
  * @param {string} config.watcherUrl the url of the watcher-info server (running in both security-critical and informational mode)
  * @param {string} config.watcherSecurityUrl *optional* the url of the watcher security server. If this is set, all security related endpoints would be using from this url instead.
  * @param {string} [config.watcherProxyUrl] *optional* the proxy url for requests made to the watcher server
  * @param {string} config.plasmaContractAddress the address of the PlasmaFramework contract
  * @return {ChildChain} a ChildChain Object
  *
  */
  constructor ({ watcherUrl, watcherProxyUrl, watcherSecurityUrl, plasmaContractAddress }) {
    Joi.assert({ watcherUrl, watcherProxyUrl, watcherSecurityUrl, plasmaContractAddress }, childchainConstructorSchema)
    this.watcherUrl = watcherUrl
    this.watcherSecurityUrl = watcherSecurityUrl || watcherUrl
    this.watcherProxyUrl = watcherProxyUrl
    this.plasmaContractAddress = plasmaContractAddress
  }

  /**
   * Gets the UTXOs of an address
   *
   * @method getUtxos
   * @param {string} address address to check
   * @return {Promise<UTXO[]>} promise that resolves with an array of UTXOs
   */
  async getUtxos (address) {
    Joi.assert(address, getUtxosSchema)
    return rpcApi.post({
      url: `${this.watcherUrl}/account.get_utxos`,
      body: { address },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the balance of an address
   *
   * @method getBalance
   * @param {string} address address to check
   * @return {Promise<Balance[]>} promise that resolves with an array of balances (one per currency)
   */
  async getBalance (address) {
    Joi.assert(address, getBalanceSchema)
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
   * @param {string} id the hash of the transaction to get
   * @return {Promise<TransactionData>} promise that resolves with a transaction
   */

  async getTransaction (id) {
    Joi.assert({ id }, getTransactionSchema)
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.get`,
      body: { id },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get supported fee tokens and amounts
   *
   * @method getFees
   * @return {Promise<FeeInfo>}
   */
  async getFees () {
    return rpcApi.post({
      url: `${this.watcherUrl}/fees.all`,
      body: {},
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get transactions
   *
   * @method getTransactions
   * @param {Object} filters filter object
   * @param {string} [filters.address] address to filter by
   * @param {string} [filters.metadata] metadata to filter by
   * @param {number} [filters.blknum] blknum to filter by
   * @param {number} [filters.limit] max number of transactions to return
   * @param {number} [filters.page] page of paginated request
   * @return {Promise<TransactionData[]>} promise that resolves with an array of transactions
   */
  async getTransactions (filters) {
    Joi.assert(filters, getTransactionsSchema)
    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.all`,
      body: filters,
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get deposits
   *
   * @method getDeposits
   * @param {Object} filters filter object
   * @param {string} [filters.address] address to filter by
   * @param {number} [filters.limit] max number of transactions to return
   * @param {number} [filters.page] page of paginated request
   * @return {Promise<DepositInfo>} promise that resolves with an array of confirmed deposits
   */
  async getDeposits (filters) {
    Joi.assert(filters, getDepositsSchema)
    return rpcApi.post({
      url: `${this.watcherUrl}/deposit.all`,
      body: filters,
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the exit data for a UTXO
   *
   * @method getExitData
   * @param {UTXO} utxo utxo object
   * @return {Promise<ExitData>} promise that resolves with the exit data for the UTXO
   */
  async getExitData (utxo) {
    Joi.assert(utxo, getExitDataSchema)
    const utxoPos = transaction.encodeUtxoPos(utxo)
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/utxo.get_exit_data`,
      body: { utxo_pos: utxoPos },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the challenge data for a UTXO
   *
   * @method getChallengeData
   * @param {number} utxoPos utxo position
   * @return {Promise<Object>} promise that resolves with the challenge data
   */
  async getChallengeData (utxoPos) {
    Joi.assert({ utxoPos }, getChallengeDataSchema)
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/utxo.get_challenge_data`,
      body: { utxo_pos: utxoPos },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Given currency, amount and spender, finds spender's inputs sufficient to perform a payment. If also provided with receiver's address, creates and encodes a transaction.
   * Note that this method cannot be used to create merge or split transaction.
   *
   * @method createTransaction
   * @param {Object} args an arguments object
   * @param {string} args.owner owner of the input utxos
   * @param {Payment[]} args.payments payments made as outputs
   * @param {Fee} [args.fee] a fee object only containing the currency to be used for the fee. The fee amount is automatically calculated by the child chain
   * @param {string} [args.metadata] metadata to include in the transaction
   * @return {Promise<Object>} promise that resolves with an object containing the list of transactions that will fullfil the required spend
   */
  createTransaction ({ owner, payments, fee, metadata }) {
    Joi.assert({ owner, payments, fee, metadata }, createTransactionSchema)
    const _metadata = metadata
      ? transaction.encodeMetadata(metadata)
      : transaction.NULL_METADATA

    const _payments = payments.map((payment) => ({
      ...payment,
      amount: new BN(payment.amount)
    }))

    return rpcApi.post({
      url: `${this.watcherUrl}/transaction.create`,
      body: {
        owner,
        payments: _payments,
        fee,
        metadata: _metadata
      },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Signs the transaction's typed data that is returned from `createTransaction`
   *
   * @method signTypedData
   * @param {Object} txData the transaction data that is returned from `createTransaction`
   * @param {string[]} privateKeys an array of private keys to sign the inputs of the transaction
   * @return {Object} a transaction typed data, including the signatures. This can be passed in to `submitTyped`
   */
  signTypedData (txData, privateKeys) {
    Joi.assert({ txData, privateKeys }, signTypedDataSchema)
    const toSign = Buffer.from(txData.sign_hash.replace('0x', ''), 'hex')
    txData.typed_data.signatures = sign(toSign, privateKeys)
    return txData.typed_data
  }

  /**
   * Submits a transaction along with its typed data and signatures to the watcher.
   *
   * @method submitTyped
   * @param {Object} data can be obtained by calling `signTypedData`
   * @return {Promise<Object>} promise that resolves with a transaction
   */
  submitTyped (data) {
    Joi.assert(data, submitTypedSchema)
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
   * @param {Object} typedData the typedData of the transaction, as returned by transaction.getTypedData()
   * @param {string[]} privateKeys an array of private keys to sign the inputs of the transaction
   * @return {string[]} array of signatures
   */
  signTransaction (typedData, privateKeys) {
    Joi.assert({ typedData, privateKeys }, signTransactionSchema)
    const toSign = transaction.getToSignHash(typedData)
    return sign(toSign, privateKeys)
  }

  /**
   * Build a signed transaction into the format expected by submitTransaction
   *
   * @method buildSignedTransaction
   * @param {Object} typedData the typedData of the transaction, as returned by transaction.getTypedData
   * @param {string[]} signatures an array of signatures, one for each input spent by the transaction
   * @return {string} a signed transaction
   */
  buildSignedTransaction (typedData, signatures) {
    Joi.assert({ typedData, signatures }, buildSignedTransactionSchema)
    const txArray = transaction.toArray(typedData.message)
    const signedTx = [signatures, typedData.message.txType, ...txArray]
    return hexPrefix(rlp.encode(signedTx).toString('hex'))
  }

  /**
   * Submit a signed transaction to the watcher
   *
   * @method submitTransaction
   * @param {string} transaction the encoded signed transaction, as returned by buildSignedTransaction
   * @return {Promise<Object>} promise that resolves with the submitted transaction
   */
  async submitTransaction (transaction) {
    Joi.assert({ transaction }, submitTransactionSchema)
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/transaction.submit`,
      body: { transaction: transaction.startsWith('0x') ? transaction : `0x${transaction}` },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Create, sign, build and submit a transaction to the childchain using raw privatekey
   *
   * @method sendTransaction
   * @param {Object} args an arguments object
   * @param {string} args.fromAddress the address of the sender
   * @param {Object[]} args.fromUtxos array of utxos to spend
   * @param {string[]} args.fromPrivateKeys private keys of the utxos to spend
   * @param {Payment[]} args.payments a payments object
   * @param {Fee} args.fee fee object specifying amount and currency
   * @param {string} [args.metadata] the metadata to include in the transaction
   * @return {Promise<Object>} promise that resolves with the submitted transaction
   */
  async sendTransaction ({
    fromAddress,
    fromUtxos,
    fromPrivateKeys,
    payments,
    fee,
    metadata
  }) {
    Joi.assert({
      fromAddress,
      fromUtxos,
      fromPrivateKeys,
      payments,
      fee,
      metadata
    }, sendTransactionSchema)

    const _metadata = metadata
      ? transaction.encodeMetadata(metadata)
      : transaction.NULL_METADATA

    const txBody = transaction.createTransactionBody({
      fromAddress,
      fromUtxos,
      payments,
      fee,
      metadata: _metadata
    })
    const typedData = transaction.getTypedData(txBody, this.plasmaContractAddress)
    const signatures = this.signTransaction(typedData, fromPrivateKeys)
    const signedTx = this.buildSignedTransaction(typedData, signatures)
    return this.submitTransaction(signedTx)
  }

  /**
   * Merge utxos to a single output
   *
   * @method mergeUtxos
   * @param {Object} args an arguments object
   * @param {UTXO[]} args.utxos a utxo array
   * @param {string} args.privateKey private key of the owner's utxo
   * @return {Promise<Object>} promise that resolves with the submitted merge transaction
   */
  async mergeUtxos ({
    utxos,
    privateKey,
    metadata = transaction.NULL_METADATA
  }) {
    Joi.assert({
      utxos,
      privateKey,
      metadata
    }, mergeUtxosSchema)

    const txBody = {
      inputs: utxos,
      outputs: [utxo.mergeUtxosToOutput(utxos)],
      txData: 0,
      metadata
    }

    const typedData = transaction.getTypedData(txBody, this.plasmaContractAddress)
    const signatures = this.signTransaction(typedData, new Array(utxos.length).fill(privateKey))
    const signedTx = this.buildSignedTransaction(typedData, signatures)
    return this.submitTransaction(signedTx)
  }

  /**
   * Returns the current status of the Watcher
   * Should be called periodically to see if there are any byzantine_events to be acted on
   *
   * @method status
   * @return {Promise<Object>} promise that resolves with the status
   */
  async status () {
    return rpcApi.post({
      url: `${this.watcherUrl}/status.get`,
      body: {},
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Gets the data to challenge an invalid input piggybacked on an in-flight exit
   *
   * @method inFlightExitGetInputChallengeData
   * @param {string} txbytes the hex-encoded transaction
   * @param {number} inputIndex invalid input index
   * @return {Promise<Object>} promise that resolves with input challenge data for the in-flight transaction
   */
  async inFlightExitGetInputChallengeData (txbytes, inputIndex) {
    Joi.assert({ txbytes, inputIndex }, inFlightExitGetInputChallengeDataSchema)
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/in_flight_exit.get_input_challenge_data`,
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
   * @return {Promise<Object>} promise that resolves with the input challenge data for the in-flight transaction
   */
  async inFlightExitGetOutputChallengeData (txbytes, outputIndex) {
    Joi.assert({ txbytes, outputIndex }, inFlightExitGetOutputChallengeDataSchema)
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/in_flight_exit.get_output_challenge_data`,
      body: {
        txbytes: hexPrefix(txbytes),
        output_index: outputIndex
      },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get the exit data for an in-flight transaction
   *
   * @method inFlightExitGetData
   * @param {string} txbytes the hex-encoded transaction
   * @return {Promise<Object>} promise that resolves with exit data for the in-flight transaction
   */
  async inFlightExitGetData (txbytes) {
    Joi.assert(txbytes, Joi.string().required())
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/in_flight_exit.get_data`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Get a competitor for an in-flight transaction
   *
   * @method inFlightExitGetCompetitor
   * @param {string} txbytes the hex-encoded transaction
   * @return {Promise<Object>} promise that resolves with a competitor to the in-flight transaction
   */
  async inFlightExitGetCompetitor (txbytes) {
    Joi.assert(txbytes, Joi.string().required())
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/in_flight_exit.get_competitor`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }

  /**
   * Proves that a transaction has been put into a block (and therefore is canonical)
   *
   * @method inFlightExitProveCanonical
   * @param {string} txbytes the hex-encoded transaction
   * @return {Promise<Object>} promise that resolves with the inclusion proof of the transaction
   */
  async inFlightExitProveCanonical (txbytes) {
    Joi.assert(txbytes, Joi.string().required())
    return rpcApi.post({
      url: `${this.watcherSecurityUrl}/in_flight_exit.prove_canonical`,
      body: { txbytes: hexPrefix(txbytes) },
      proxyUrl: this.watcherProxyUrl
    })
  }
}

module.exports = ChildChain
