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

const STANDARD_EXIT_BOND = 31415926535
// const INFLIGHT_EXIT_BOND = 31415926535
// const PIGGYBACK_BOND = 31415926535
const DEFAULT_GAS = 2000000

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
   * Deposit ETH to rootchain
   *
   * @method depositEth
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {number} amount amount of ETH to deposit
   * @param {object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */

  async depositEth (depositTx, amount, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      value: amount,
      data: this.plasmaContract.methods.deposit(depositTx).encodeABI(),
      gas: txOptions.gas || DEFAULT_GAS
    }

    return sendTx(this.eth, txDetails, txOptions.privateKey)
  }

  /**
   * Deposit ERC20 Token to rootchain (caller must be token owner)
   *
   * @method depositToken
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */

  async depositToken (depositTx, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.depositFrom(depositTx).encodeABI(),
      gas: txOptions.gas || DEFAULT_GAS
    }

    return sendTx(this.eth, txDetails, txOptions.privateKey)
  }

  /**
   * Starts a standard withdrawal of a given output. Uses output-age priority.
   *
   * @method startStandardExit
   * @param {number} outputId Identifier of the exiting output.
   * @param {string} outputTx RLP encoded transaction that created the exiting output.
   * @param {string} inclusionProof A Merkle proof showing that the transaction was included.
   * @param {object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async startStandardExit (outputId, outputTx, inclusionProof, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.startStandardExit(
        outputId,
        Web3Utils.hexToBytes(`0x${outputTx}`),
        Web3Utils.hexToBytes(`0x${inclusionProof}`)
      ).encodeABI(),
      value: txOptions.value || STANDARD_EXIT_BOND,
      gas: txOptions.gas || DEFAULT_GAS
    }

    return sendTx(this.eth, txDetails, txOptions.privateKey)
  }

  /**
   * Blocks a standard exit by showing the exiting output was spent.
   *
   * @method challengeStandardExit
   * @param {number} outputId Identifier of the exiting output.
   * @param {string} challengeTx RLP encoded transaction that spends the exiting output.
   * @param {number} inputIndex Which input to the challenging tx corresponds to the exiting output.
   * @param {string} challengeTxSig Signature from the exiting output owner over the spend.
   * @param {object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeStandardExit (outputId, challengeTx, inputIndex, challengeTxSig, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.challengeStandardExit(
        outputId,
        Web3Utils.hexToBytes(`0x${challengeTx}`),
        inputIndex,
        Web3Utils.hexToBytes(`0x${challengeTxSig}`)
      ).encodeABI(),
      gas: txOptions.gas || DEFAULT_GAS
    }

    return sendTx(this.eth, txDetails, txOptions.privateKey)
  }

  /**
   * Processes any exits that have completed the challenge period.
   * @method processExits
   * @param {string} token Address of the token to process.
   * @param {number} topUtxoPos First exit that should be processed. Set to zero to skip the check.
   * @param {number} exitsToProcess Maximum number of exits to process.
   * @param {object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async processExits (token, topUtxoPos, exitsToProcess, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: this.plasmaContract.methods.processExits(token, topUtxoPos, exitsToProcess).encodeABI(),
      gas: txOptions.gas || DEFAULT_GAS
    }

    return sendTx(this.eth, txDetails, txOptions.privateKey)
  }

  getStandardExitBond () {
    // TODO Get this from the contract
    return STANDARD_EXIT_BOND
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
