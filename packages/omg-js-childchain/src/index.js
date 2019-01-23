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

const rpcApi = require('./rpc/rpcApi')
const sign = require('./transaction/signature')
const rlp = require('rlp')
const { InvalidArgumentError, transaction } = require('@omisego/omg-js-util')
global.Buffer = global.Buffer || require('buffer').Buffer

class ChildChain {
  /**
  *Interact with Tesuji Plasma Childchain from JavaScript (Node.js and Browser)
  *
  *@param {string} watcherUrl contains the url of the watcher server
  *@param {string} childChainUrl contains the url of the childchain server to communicate with
  *@return {object} Childchain Object
  *
  */
  constructor (watcherUrl, childChainUrl) {
    this.watcherUrl = watcherUrl
    this.childChainUrl = childChainUrl
  }
  /**
   * Obtain UTXOs of an address
   *
   * @method getUtxos
   * @param {String} address
   * @return {array} arrays of UTXOs
   */
  async getUtxos (address) {
    validateAddress(address)
    return rpcApi.post(`${this.watcherUrl}/account.get_utxos`, { address })
  }

  /**
   * Get the balance of an address
   *
   * @method getBalance
   * @param {String} address
   * @return {array} array of balances (one per currency)
   */
  async getBalance (address) {
    validateAddress(address)
    return rpcApi.post(`${this.watcherUrl}/account.get_balance`, { address })
  }

  async getExitData (utxo) {
    // Calculate the utxoPos
    const utxoPos = this.encodeUtxoPos(utxo)
    return rpcApi.post(`${this.watcherUrl}/utxo.get_exit_data`, { utxo_pos: Number(utxoPos.toString()) })
  }

  async getChallengeData (utxo) {
    // Calculate the utxoPos
    const utxoPos = this.encodeUtxoPos(utxo)
    return rpcApi.post(`${this.watcherUrl}/utxo.get_challenge_data`, { utxo_pos: Number(utxoPos.toString()) })
  }

  encodeUtxoPos (utxo) {
    return transaction.encodeUtxoPos(utxo)
  }

  /**
   * Create an unsigned transaction
   *
   * @method createTransaction
   * @param {object} transactionBody
   * @return {object}
   */
  createTransaction (transactionBody) {
    transaction.validate(transactionBody)
    const txArray = transaction.toArray(transactionBody)
    return rlp.encode(txArray).toString('hex')
  }

  /**
   * Sign a transaction
   *
   * @method signTransaction
   * @param {string} unsignedTx
   * @param {array} privateKeys
   * @return {array} signatures
   */
  signTransaction (unsignedTx, privateKeys) {
    privateKeys.forEach(key => validatePrivateKey)
    return sign(Buffer.from(unsignedTx, 'hex'), privateKeys)
  }

  /**
   * Build a signed transaction into the format expected by submitTransaction
   *
   * @method buildSignedTransaction
   * @param {string} unsignedTx
   * @param {array} signatures
   * @return {object}
   */
  buildSignedTransaction (unsignedTx, signatures) {
    // rlp-decode the tx bytes
    const decodedTx = rlp.decode(Buffer.from(unsignedTx, 'hex'))
    // Append the signatures
    const signedTx = [signatures, ...decodedTx]
    // rlp-encode the transaction + signatures
    return rlp.encode(signedTx).toString('hex')
  }

  /**
   * Submit a signed transaction to the childchain
   *
   * @method submitTransaction
   * @param {string} transaction
   * @return {object}
   */
  async submitTransaction (transaction) {
    // validateTxBody(transactionBody)
    return rpcApi.post(`${this.childChainUrl}/transaction.submit`, { transaction })
  }

  /**
   * create, sign, build and submit a transaction to the childchain using raw privatekey
   *
   * @method sendTransaction
   * @param {array} fromAddress - the address of the sender
   * @param {array} fromUtxos - array of utxos gathered from the watcher
   * @param {array} fromPrivateKeys - array of hex string private key
   * @param {string} toAddress - the address of the recipient
   * @param {number} toAmount - amount to transact
   * @return {object}
   */
  async sendTransaction (fromAddress, fromUtxos, fromPrivateKeys, toAddress, toAmount) {
    validateAddress(fromAddress)
    validateAddress(toAddress)
    validatePrivateKey(fromPrivateKeys)

    // create the transaction body
    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount)
    // create transaction
    const unsignedTx = this.createTransaction(txBody)
    // sign transaction
    const signatures = this.signTransaction(unsignedTx, fromPrivateKeys)
    // build transaction
    const signedTx = this.buildSignedTransaction(unsignedTx, signatures)
    // submit transaction
    return this.submitTransaction(signedTx)
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
