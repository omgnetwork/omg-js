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

const Web3Eth = require('web3-eth')
const Web3Utils = require('web3-utils')
const debug = require('debug')('omg.rootchain')

class RootChain {
  /**
  * Interact with Tesuji Plasma Rootchain from JavaScript (Node.js and Browser)
  *
  * @param {string} web3Provider contains the url of the watcher server
  * @param {string} plasmaContractAddress the address of the RootChain contract
  * @param {string} plasmaAbi the abi of the RootChain contract. If not set the default abi included in './contracts/Rootchain' will be used.
  * @return {object} Rootchain Object
  *
  */

  constructor (web3Provider, plasmaContractAddress, plasmaAbi) {
    this.eth = new Web3Eth(web3Provider)
    this.plasmaContractAddress = plasmaContractAddress
    const contractAbi = plasmaAbi || require('./contracts/RootChain.json')
    this.plasmaContract = new this.eth.Contract(contractAbi.abi, plasmaContractAddress)
  }

  /**
   * deposit ETH to rootchain
   *
   * @method depositEth
   * @param {number} amount amount of ETH to deposit
   * @param {string} fromAddress address to make the deposit from
   * @param {string} privateKey private key to sign the transaction with. If not set, assume sending from an unlocked geth account
   * @return {string} transaction Hash of the deposit
   */

  async depositEth (amount, fromAddress, privateKey) {
    const txDetails = {
      from: fromAddress,
      to: this.plasmaContractAddress,
      value: amount,
      data: this.plasmaContract.methods.deposit().encodeABI(),
      gas: 2000000
    }

    return sendTx(this.eth, txDetails, privateKey)
  }

  /**
   * deposit Token to rootchain
   *
   * @method depositToken
   * @param {number} amount amount of ETH to deposit
   * @param {string} fromAddress address to make the deposit from
   * @param {string} tokenAddress address of the ERC20 Token
   * @param {string} privateKey private key to sign the transaction with. If not set, assume sending from an unlocked geth account
   * @return {string} transaction Hash of the deposit
   */

  async depositToken (amount, fromAddress, tokenAddress, privateKey) {
    const txDetails = {
      from: fromAddress,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.depositFrom(fromAddress, tokenAddress, amount).encodeABI(),
      gas: 2000000
    }

    return sendTx(this.eth, txDetails, privateKey)
  }

  /**
   * get the block number of the deposit in the childchain
   *
   * @method getDepositBlock
   * @param {string} txhash transaction hash
   * @return {number} block number of the deposit inside the childchain
   */

  async getDepositBlock (txhash) {
    const receipt = await this.eth.getTransactionReceipt(txhash)
    if (!receipt) {
      console.error(`Error - no transaction receipt found for ${txhash}`)
      return null
    }
    let encodedBlkNum = receipt.logs[0].topics[2]
    debug(`encoded block number: ${encodedBlkNum}`)
    return Number(this.eth.abi.decodeParameter('uint256', encodedBlkNum))
  }

  async startExit (fromAddress, utxoPos, txBytes, proof, sigs, privateKey) {
    const txDetails = {
      from: fromAddress,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.startExit(
        utxoPos,
        Web3Utils.hexToBytes(`0x${txBytes}`),
        Web3Utils.hexToBytes(`0x${proof}`),
        Web3Utils.hexToBytes(`0x${sigs}`)
      ).encodeABI(),
      gas: 2000000
    }

    return sendTx(this.eth, txDetails, privateKey)
  }

  async challengeExit (fromAddress, cUtxoPos, eUtxoIndex, txBytes, proof, sigs, privateKey) {
    const txDetails = {
      from: fromAddress,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.challengeExit(
        cUtxoPos,
        eUtxoIndex,
        Web3Utils.hexToBytes(`0x${txBytes}`),
        Web3Utils.hexToBytes(`0x${proof}`),
        Web3Utils.hexToBytes(`0x${sigs}`)
      ).encodeABI(),
      gas: 2000000
    }

    return sendTx(this.eth, txDetails, privateKey)
  }

  async finalizeExits (fromAddress, token, topUtxoPos, exitsToProcess, privateKey) {
    const txDetails = {
      from: fromAddress,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.finalizeExits(token, topUtxoPos, exitsToProcess).encodeABI(),
      gas: 2000000
    }

    return sendTx(this.eth, txDetails, privateKey)
  }
}

async function sendTx (eth, txDetails, privateKey) {
  if (!privateKey) {
    // No privateKey to sign with, assume sending from an unlocked geth account
    return eth.sendTransaction(txDetails)
  } else {
    // First sign the transaction
    const signedTx = await eth.accounts.signTransaction(txDetails, privateKey)
    // Then send it
    return eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

module.exports = RootChain
