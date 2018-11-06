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

const watcherApi = require('./watcherApi')
const sign = require('./transaction/signature')
const submitTx = require('./transaction/submitRPC')
const transaction = require('./transaction/transaction')
const rlp = require('rlp')
const { InvalidArgumentError } = require('@omisego/omg-js-util')
global.Buffer = global.Buffer || require('buffer').Buffer
const Web3Utils = require('web3-utils')

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
    return watcherApi.get(`${this.watcherUrl}/utxos?address=${address}`)
  }

  /**
   * Get the balance of an address
   *
   * @method getBalance
   * @param {String} address
   * @return {array} array of balances (one per currency)
   */
  async getBalance (address) {
    // return watcherApi.get(`${this.watcherUrl}/account/${address}/balance`)

    // TODO Temporarily use getUtxos to calculate balance because watcher/account/${address}/balance api is not deployed yet.
    validateAddress(address)
    const utxos = await this.getUtxos(address)
    const balanceMap = utxos.reduce((acc, curr) => {
      const amount = new Web3Utils.BN(curr.amount.toString())
      if (acc.has(curr.currency)) {
        const v = acc.get(curr.currency)
        acc.set(curr.currency, v.add(amount))
      } else {
        acc.set(curr.currency, amount)
      }
      return acc
    }, new Map())

    return Array.from(balanceMap).map(elem => ({ currency: elem[0], amount: elem[1] }))
  }

  async getExitData (utxo) {
    // Calculate the utxoPos
    const utxoPos = this.encodeUtxoPos(utxo)
    return watcherApi.get(`${this.watcherUrl}/utxo/${utxoPos}/exit_data`)
  }

  async getChallengeData (utxo) {
    // Calculate the utxoPos
    const utxoPos = this.encodeUtxoPos(utxo)
    return watcherApi.get(`${this.watcherUrl}/utxo/${utxoPos}/challenge_data`)
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
    const signedTx = [...decodedTx, ...signatures]
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
    return submitTx(transaction, this.childChainUrl)
  }

  /**
   * create, sign, build and submit a transaction to the childchain using raw privatekey
   *
   * @method sendTransaction
   * @param {array} fromUtxos - array of utxos gathered from the watcher
   * @param {array} fromPrivateKeys - array of hex string private key
   * @param {string} toAddress - address
   * @param {number} toAmount - amount to transact
   * @return {object}
   */
  async sendTransaction (fromUtxos, fromPrivateKeys, toAddress, toAmount) {
    validateAddress(toAddress)
    validatePrivateKey(fromPrivateKeys)
    // transform fromUtxo to txbody
    const txBody = transaction.createTransactionBody(fromUtxos, toAddress, toAmount)
    // create transaction
    const unsignedTx = this.createTransaction(txBody)
    // sign a transaction
    const signatures = this.signTransaction(unsignedTx, fromPrivateKeys)
    // build a transaction
    const signedTx = this.buildSignedTransaction(unsignedTx, signatures)
    // submit via JSON rpc
    const result = await this.submitTransaction(signedTx)
    return result
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
