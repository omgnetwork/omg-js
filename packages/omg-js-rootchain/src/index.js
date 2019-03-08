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

const { hexToBytes } = require('@omisego/omg-js-util')
const txUtils = require('./txUtils')

const STANDARD_EXIT_BOND = 31415926535
// const INFLIGHT_EXIT_BOND = 31415926535
// const PIGGYBACK_BOND = 31415926535

class RootChain {
  /**
  * Create a RootChain object
  *
  * @param {string} web3 a web3 provider (can be the url of a geth node)
  * @param {string} plasmaContractAddress the address of the RootChain contract
  * @param {string} plasmaAbi the abi of the RootChain contract. If not set the default abi included in './contracts/Rootchain' will be used.
  * @return {Object} a Rootchain object
  *
  */
  constructor (web3, plasmaContractAddress, plasmaAbi) {
    this.web3 = web3
    this.plasmaContractAddress = plasmaContractAddress
    const contractAbi = plasmaAbi || require('./contracts/RootChain.json')
    if (web3.version.api && web3.version.api.startsWith('0.2')) {
      this.plasmaContract = this.web3.eth.contract(contractAbi.abi).at(plasmaContractAddress)
    } else {
      this.plasmaContract = new this.web3.eth.Contract(contractAbi.abi, plasmaContractAddress)
    }
  }

  /**
   * Deposit ETH to rootchain
   *
   * @method depositEth
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {number} amount amount of ETH to deposit
   * @param {Object} txOptions transaction options, such as `from`, `gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async depositEth (depositTx, amount, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      value: amount,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'deposit', depositTx),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Deposit ERC20 Token to rootchain (caller must be token owner)
   *
   * @method depositToken
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async depositToken (depositTx, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'depositFrom', depositTx),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Starts a standard withdrawal of a given output. Uses output-age priority.
   *
   * @method startStandardExit
   * @param {number} outputId Identifier of the exiting output.
   * @param {string} outputTx RLP encoded transaction that created the exiting output.
   * @param {string} inclusionProof A Merkle proof showing that the transaction was included.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async startStandardExit (outputId, outputTx, inclusionProof, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'startStandardExit',
        outputId,
        hexToBytes(outputTx),
        hexToBytes(inclusionProof)
      ),
      value: txOptions.value || STANDARD_EXIT_BOND,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Blocks a standard exit by showing the exiting output was spent.
   *
   * @method challengeStandardExit
   * @param {number} outputId Identifier of the exiting output.
   * @param {string} challengeTx RLP encoded transaction that spends the exiting output.
   * @param {number} inputIndex Which input to the challenging tx corresponds to the exiting output.
   * @param {string} challengeTxSig Signature from the exiting output owner over the spend.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeStandardExit (outputId, challengeTx, inputIndex, challengeTxSig, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'challengeStandardExit',
        outputId,
        hexToBytes(challengeTx),
        inputIndex,
        hexToBytes(challengeTxSig)),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Processes any exits that have completed the challenge period.
   * @method processExits
   * @param {string} token Address of the token to process.
   * @param {number} topUtxoPos First exit that should be processed. Set to zero to skip the check.
   * @param {number} exitsToProcess Maximum number of exits to process.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async processExits (token, topUtxoPos, exitsToProcess, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'processExits',
        token, topUtxoPos, exitsToProcess),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  getStandardExitBond () {
    // TODO Get this from the contract
    return STANDARD_EXIT_BOND
  }

  /**
   * Adds a token to the Plasma chain. Tokens must be added in order to be able to exit them.
   * @method addToken
   * @param {string} token Address of the token to process.
   * @return {string} transaction hash of the call
   * @throws an exception if the token has already been added.
   */
  async addToken (token, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3, this.plasmaContract, 'addToken', token),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }
}

module.exports = RootChain
