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

const txUtils = require('./txUtils')

const STANDARD_EXIT_BOND = 31415926535
const INFLIGHT_EXIT_BOND = 31415926535
const PIGGYBACK_BOND = 31415926535
const ETH_VAULT_ID = 1
const ERC20_VAULT_ID = 2

class RootChain {
  /**
  * Create a RootChain object
  *
  * @param {string} web3 the web3 object to access the Ethereum network
  * @param {string} plasmaContractAddress the address of the RootChain contract
  * @param {string} plasmaAbi the abi of the RootChain contract. If not set the default abi included in './contracts/Rootchain' will be used.
  * @return {Object} a Rootchain object
  *
  */
  constructor (web3, plasmaContractAddress, plasmaAbi) {
    this.web3 = web3
    this.plasmaContractAddress = plasmaContractAddress
    this.isLegacyWeb3 = web3.version.api && web3.version.api.startsWith('0.2')
    // contracts abi
    this.erc20VaultAbi = require('./contracts/ERC20Vault.json')
    this.ethVaultAbi = require('./contracts/EthVault.json')
    this.exitGameRegistryAbi = require('./contracts/ExitGameRegistry.json')
    this.plasmaFrameworkAbi = plasmaAbi || require('./contracts/PlasmaFramework.json')
    this.plasmaContract = this.getContract(this.plasmaFrameworkAbi.abi, plasmaContractAddress)
  }

  getEthVaultAddress () {
    return this.plasmaContract.methods.vaults(ETH_VAULT_ID).call()
  }

  getErc20VaultAddress () {
    return this.plasmaContract.methods.vaults(ERC20_VAULT_ID).call()
  }

  getContract (abi, address) {
    if (this.isLegacyWeb3) {
      return this.web3.eth.contract(abi).at(address)
    } 
    return new this.web3.eth.Contract(abi, address)
  }
  /**
   * Deposit ETH to rootchain
   *
   * @method depositEth
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {number} amount amount of ETH to deposit
   * @param {Object} txOptions transaction options, such as `from`, `gas` and `privateKey`
   * @param {Object} [callbacks] callbacks to events from the transaction lifecycle
   * @return {Promise<{ transactionHash: string }>} promise that resolves with an object holding the transaction hash
   */
  async depositEth (depositTx, amount, txOptions, callbacks) {
    const ethVaultAddress = await this.getEthVaultAddress()
    const ethVaultContract = this.getContract(this.ethVaultAbi.abi, ethVaultAddress)
    const txDetails = {
      from: txOptions.from,
      to: ethVaultAddress,
      value: amount,
      data: txUtils.getTxData(
        this.web3,
        ethVaultContract,
        'deposit',
        depositTx
      )
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey, callbacks)
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
    const erc20VaultAddress = await this.getErc20VaultAddress()
    const erc20VaultContract = this.getContract(this.erc20VaultAbi.abi, erc20VaultAddress)
    const txDetails = {
      from: txOptions.from,
      to: erc20VaultAddress,
      data: txUtils.getTxData(
        this.web3,
        erc20VaultContract,
        'deposit',
        depositTx
      )
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
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'startStandardExit',
        outputId.toString(),
        outputTx,
        inclusionProof
      ),
      value: STANDARD_EXIT_BOND,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Blocks a standard exit by showing the exiting output was spent.
   *
   * @method challengeStandardExit
   * @param {number} standardExitId Identifier of the exiting output.
   * @param {string} challengeTx RLP encoded transaction that spends the exiting output.
   * @param {number} inputIndex Which input to the challenging tx corresponds to the exiting output.
   * @param {string} challengeTxSig Signature from the exiting output owner over the spend.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeStandardExit (standardExitId, challengeTx, inputIndex, challengeTxSig, txOptions) {
    // standardExitId is an extremely large number as it uses the entire int192.
    // It's too big to be represented as a Number, so we convert it to a hex string
    const exitId = txUtils.int192toHex(standardExitId)

    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'challengeStandardExit',
        exitId,
        challengeTx,
        inputIndex,
        challengeTxSig),
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
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'processExits',
        token,
        topUtxoPos,
        exitsToProcess
      ),
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
   * Adds an erc20 token to the Plasma chain. Tokens must be added in order to be able to exit them.
   * @method addToken
   * @param {string} token Address of the token to process.
   * @return {string} transaction hash of the call
   * @throws an exception if the token has already been added.
   */
  async addToken (token, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'addExitQueue',
        ERC20_VAULT_ID,
        token
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Starts an exit for an in-flight transaction.
   *
   * @method startInFlightExit
   * @param {string} inFlightTx RLP encoded in-flight transaction.
   * @param {string} inputTxs Transactions that created the inputs to the in-flight transaction.
   * @param {string} inputTxsInclusionProofs Merkle proofs that show the input-creating transactions are valid.
   * @param {string} inFlightTxSigs Signatures from the owners of each input.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async startInFlightExit (inFlightTx, inputTxs, inputTxsInclusionProofs, inFlightTxSigs, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'startInFlightExit',
        inFlightTx,
        inputTxs,
        inputTxsInclusionProofs,
        inFlightTxSigs
      ),
      value: INFLIGHT_EXIT_BOND,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Allows a user to piggyback onto an in-flight transaction.
   *
   * @method piggybackInFlightExit
   * @param {string} inFlightTx RLP encoded in-flight transaction.
   * @param {number} outputIndex Index of the input/output to piggyback (0-7).
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async piggybackInFlightExit (inFlightTx, outputIndex, txOptions) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'piggybackInFlightExit',
        inFlightTx,
        outputIndex
      ),
      value: PIGGYBACK_BOND,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Attempts to prove that an in-flight exit is not canonical.
   *
   * @method challengeInFlightExitNotCanonical
   * @param {string} inFlightTx RLP encoded in-flight transaction being exited.
   * @param {number} inFlightTxInputIndex Index of the double-spent input in the in-flight transaction.
   * @param {string} competingTx RLP encoded transaction that spent the input.
   * @param {number} competingTxInputIndex Index of the double-spent input in the competing transaction.
   * @param {number} competingTxPos Position of the competing transaction.
   * @param {string} competingTxInclusionProof Proof that the competing transaction was included.
   * @param {string} competingTxSig Signature proving that the owner of the input signed the competitor.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeInFlightExitNotCanonical (
    inFlightTx,
    inFlightTxInputIndex,
    competingTx,
    competingTxInputIndex,
    competingTxPos,
    competingTxInclusionProof,
    competingTxSig,
    txOptions
  ) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(this.web3,
        this.plasmaContract,
        'challengeInFlightExitNotCanonical',
        inFlightTx,
        inFlightTxInputIndex,
        competingTx,
        competingTxInputIndex,
        competingTxPos,
        competingTxInclusionProof,
        competingTxSig
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Allows a user to respond to competitors to an in-flight exit by showing the transaction is included.
   *
   * @method respondToNonCanonicalChallenge
   * @param {string} inFlightTx RLP encoded in-flight transaction being exited.
   * @param {number} inFlightTxPos Position of the in-flight transaction in the chain.
   * @param {string} inFlightTxInclusionProof Proof that the in-flight transaction is included before the competitor.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async respondToNonCanonicalChallenge (
    inFlightTx,
    inFlightTxPos,
    inFlightTxInclusionProof,
    txOptions
  ) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'respondToNonCanonicalChallenge',
        inFlightTx,
        inFlightTxPos,
        inFlightTxInclusionProof
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Removes an input from list of exitable outputs in an in-flight transaction.
   * @method challengeInFlightExitInputSpent
   * @param {string} inFlightTx RLP encoded in-flight transaction being exited.
   * @param {number} inFlightTxInputIndex Input that's been spent.
   * @param {string} spendingTx RLP encoded transaction that spends the input.
   * @param {number} spendingTxInputIndex Which input to the spending transaction spends the input.
   * @param {string} spendingTxSig Signature that shows the input owner signed the spending transaction.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeInFlightExitInputSpent (
    inFlightTx,
    inFlightTxInputIndex,
    spendingTx,
    spendingTxInputIndex,
    spendingTxSig,
    txOptions
  ) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'challengeInFlightExitInputSpent',
        inFlightTx,
        inFlightTxInputIndex,
        spendingTx,
        spendingTxInputIndex,
        spendingTxSig
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }

  /**
   * Removes an output from list of exitable outputs in an in-flight transaction.
   * @method challengeInFlightExitOutputSpent
   * @param {string} inFlightTx RLP encoded in-flight transaction being exited.
   * @param {number} inFlightTxOutputPos Output that's been spent.
   * @param {string} inFlightTxInclusionProof Proof that the in-flight transaction was included.
   * @param {string} spendingTx RLP encoded transaction that spends the input.
   * @param {number} spendingTxInputIndex Which input to the spending transaction spends the input.
   * @param {string} spendingTxSig Signature that shows the input owner signed the spending transaction.
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async challengeInFlightExitOutputSpent (
    inFlightTx,
    inFlightTxOutputPos,
    inFlightTxInclusionProof,
    spendingTx,
    spendingTxInputIndex,
    spendingTxSig,
    txOptions
  ) {
    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'challengeInFlightExitOutputSpent',
        inFlightTx,
        inFlightTxOutputPos,
        inFlightTxInclusionProof,
        spendingTx,
        spendingTxInputIndex,
        spendingTxSig
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx(this.web3, txDetails, txOptions.privateKey)
  }
}

module.exports = RootChain
