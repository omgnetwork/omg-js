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

const txUtils = require('./txUtils')
const { transaction } = require('@omisego/omg-js-util')
const webUtils = require('web3-utils')
const erc20abi = require('human-standard-token-abi')
const {
  approveTokenSchema,
  depositEthSchema,
  depositTokenSchema,
  startStandardExitSchema,
  challengeStandardExitSchema
} = require('./validators')
const Joi = require('@hapi/joi')

const ETH_VAULT_ID = 1
const ERC20_VAULT_ID = 2
const PAYMENT_TYPE = 1

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
  constructor ({ web3, plasmaContractAddress, plasmaAbi }) {
    this.web3 = web3
    this.plasmaContractAddress = plasmaContractAddress
    this.isLegacyWeb3 = web3.version.api && web3.version.api.startsWith('0.2')
    // contracts abi
    this.erc20VaultAbi = require('./contracts/Erc20Vault.json')
    this.ethVaultAbi = require('./contracts/EthVault.json')
    this.exitGameRegistryAbi = require('./contracts/ExitGameRegistry.json')
    this.paymentExitGameAbi = require('./contracts/PaymentExitGame.json')
    this.plasmaFrameworkAbi =
      plasmaAbi || require('./contracts/PlasmaFramework.json')

    this.plasmaContract = this.getContract(
      this.plasmaFrameworkAbi.abi,
      plasmaContractAddress
    )
  }

  async getErc20Vault () {
    if (!this.erc20Vault) {
      const address = await this.plasmaContract.methods
        .vaults(ERC20_VAULT_ID)
        .call()
      const contract = this.getContract(this.erc20VaultAbi.abi, address)
      this.erc20Vault = { contract, address }
    }
    return this.erc20Vault
  }

  async getEthVault () {
    if (!this.ethVault) {
      const address = await this.plasmaContract.methods
        .vaults(ETH_VAULT_ID)
        .call()
      const contract = this.getContract(this.ethVaultAbi.abi, address)
      this.ethVault = { contract, address }
    }
    return this.ethVault
  }

  async getPaymentExitGame () {
    if (!this.paymentExitGame) {
      const address = await this.plasmaContract.methods
        .exitGames(PAYMENT_TYPE)
        .call()
      const contract = this.getContract(this.paymentExitGameAbi.abi, address)

      const bondSizes = await Promise.all([
        contract.methods.startStandardExitBondSize().call(),
        contract.methods.piggybackBondSize().call(),
        contract.methods.startIFEBondSize().call()
      ])

      this.paymentExitGame = {
        contract,
        address,
        bonds: {
          standardExit: Number(bondSizes[0]),
          piggyback: Number(bondSizes[1]),
          inflightExit: Number(bondSizes[2])
        }
      }
    }
    return this.paymentExitGame
  }

  getContract (abi, address) {
    if (this.isLegacyWeb3) {
      return this.web3.eth.contract(abi).at(address)
    }
    return new this.web3.eth.Contract(abi, address)
  }

  /**
   * Approve ERC20 for deposit
   *
   * @method approveToken
   * @param {string} erc20Address address of the ERC20 token
   * @param {number} amount amount of ERC20 to approve to deposit
   * @param {Object} txOptions transaction options, such as `from`, `gas` and `privateKey`
   * @return {Promise<{ transactionHash: string }>} promise that resolves with an object holding the transaction hash
   */
  async approveToken ({ erc20Address, amount, txOptions }) {
    Joi.assert({ erc20Address, amount, txOptions }, approveTokenSchema)
    const { address: spender } = await this.getErc20Vault()
    const erc20Contract = this.getContract(erc20abi, erc20Address)
    const txDetails = {
      from: txOptions.from,
      to: erc20Address,
      data: erc20Contract.methods.approve(spender, amount).encodeABI(),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async depositEth ({ depositTx, amount, txOptions, callbacks }) {
    Joi.assert({ depositTx, amount, txOptions, callbacks }, depositEthSchema)
    const { contract, address } = await this.getEthVault()
    const txDetails = {
      from: txOptions.from,
      to: address,
      value: webUtils.toHex(amount),
      data: txUtils.getTxData(this.web3, contract, 'deposit', depositTx),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey,
      callbacks
    })
  }

  /**
   * Deposit ERC20 Token to rootchain (caller must be token owner)
   *
   * @method depositToken
   * @param {string} depositTx RLP encoded childchain deposit transaction
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async depositToken ({ depositTx, txOptions }) {
    Joi.assert({ depositTx, txOptions }, depositTokenSchema)
    const { address, contract } = await this.getErc20Vault()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(this.web3, contract, 'deposit', depositTx),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
  }

  /**
   * Get standard exit id to use when processing a standard exit
   *
   * @method getStandardExitId
   * @param {string} txBytes txBytes from the standard exit
   * @param {string} utxoPos the UTXO position of the UTXO being exited
   * @param {boolean} isDeposit whether the standard exit is of a deposit UTXO
   */
  async getStandardExitId ({ txBytes, utxoPos, isDeposit }) {
    const { contract } = await this.getPaymentExitGame()
    const exitId = await contract.methods
      .getStandardExitId(isDeposit, txBytes, utxoPos)
      .call()
    return exitId
  }

  /**
   * Get inflight exit id to use when processing an inflight exit
   *
   * @method getInFlightExitId
   * @param {string} txBytes txBytes from the inflight exit
   */
  async getInFlightExitId ({ txBytes }) {
    const { contract } = await this.getPaymentExitGame()
    const exitId = await contract.methods.getInFlightExitId(txBytes).call()
    return exitId
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
  async startStandardExit ({ outputId, outputTx, inclusionProof, txOptions }) {
    Joi.assert(
      { outputId, outputTx, inclusionProof, txOptions },
      startStandardExitSchema
    )
    const { contract, address, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(this.web3, contract, 'startStandardExit', [
        outputId.toString(),
        outputTx,
        '0x',
        inclusionProof
      ]),
      value: bonds.standardExit,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async challengeStandardExit ({
    standardExitId,
    exitingTx,
    challengeTx,
    inputIndex,
    challengeTxSig,
    txOptions
  }) {
    Joi.assert({
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      txOptions
    }, challengeStandardExitSchema)
    // standardExitId is an extremely large number as it uses the entire int192.
    // It's too big to be represented as a Number, so we convert it to a hex string
    const exitId = txUtils.int192toHex(standardExitId)
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(this.web3, contract, 'challengeStandardExit', [
        exitId,
        exitingTx,
        challengeTx,
        inputIndex,
        challengeTxSig,
        // below args not necessary for ALD but we pass empty values to keep the contract happy
        '0x', // spendingConditionOptionalArgs
        '0x', // outputGuardPreimage
        0, // challengeTxPos
        '0x', // challengeTxInclusionProof
        '0x' // challengeTxConfirmSig
      ]),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
  }

  /**
   * Processes any exit that has completed the challenge period.
   * @method processExits
   * @param {string} token An address of the token to exit.
   * @param {string} exitId An exit id returned from startStandardExit.
   * @param {number} maxExitsToProcess The max number of exits to process
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async processExits ({ token, exitId, maxExitsToProcess, txOptions }) {
    const vaultId = token === transaction.ETH_CURRENCY ? 1 : 2

    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'processExits',
        vaultId,
        token,
        exitId,
        maxExitsToProcess
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
  }

  /**
   * Checks if an exit queue exists for this token
   * @method hasToken
   * @param {string} token address of the token to check.
   * @return {boolean} whether an exit queue exists for this token
   */
  hasToken (token) {
    const vaultId = token === transaction.ETH_CURRENCY ? 1 : 2
    return this.plasmaContract.methods.hasExitQueue(vaultId, token).call()
  }

  /**
   * Adds a token to the Plasma chain. Tokens must be added in order to be able to exit them.
   * @method addToken
   * @param {string} token Address of the token to process.
   * @return {string} transaction hash of the call
   * @throws an exception if the token has already been added.
   */
  async addToken ({ token, txOptions }) {
    const vaultId = token === transaction.ETH_CURRENCY ? 1 : 2

    const txDetails = {
      from: txOptions.from,
      to: this.plasmaContractAddress,
      data: txUtils.getTxData(
        this.web3,
        this.plasmaContract,
        'addExitQueue',
        vaultId,
        token
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }

    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async startInFlightExit ({
    inFlightTx,
    inputTxs,
    inputUtxosPos,
    outputGuardPreimagesForInputs,
    inputTxsInclusionProofs,
    inFlightTxSigs,
    signatures,
    inputSpendingConditionOptionalArgs,
    txOptions
  }) {
    const { address, contract, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(this.web3, contract, 'startInFlightExit', [
        inFlightTx,
        inputTxs,
        inputUtxosPos,
        outputGuardPreimagesForInputs,
        inputTxsInclusionProofs,
        inFlightTxSigs,
        signatures,
        inputSpendingConditionOptionalArgs
      ]),
      value: bonds.inflightExit,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async piggybackInFlightExitOnOutput ({
    inFlightTx,
    outputIndex,
    outputGuardPreimage,
    txOptions
  }) {
    const { address, contract, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'piggybackInFlightExitOnOutput',
        [inFlightTx, outputIndex, outputGuardPreimage]
      ),
      value: bonds.piggyback,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
  }

  /**
   * Allows a user to piggyback onto an in-flight transaction.
   *
   * @method piggybackInFlightExit
   * @param {string} inFlightTx RLP encoded in-flight transaction.
   * @param {number} inputIndex Index of the input/output to piggyback (0-7).
   * @param {Object} txOptions transaction options, such as `from`, gas` and `privateKey`
   * @return {string} transaction hash of the call
   */
  async piggybackInFlightExitOnInput ({ inFlightTx, inputIndex, txOptions }) {
    const { address, contract, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'piggybackInFlightExitOnInput',
        [inFlightTx, inputIndex]
      ),
      value: bonds.piggyback,
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async challengeInFlightExitNotCanonical ({
    inputTx,
    inputUtxoPos,
    inFlightTx,
    inFlightTxInputIndex,
    competingTx,
    competingTxInputIndex,
    outputGuardPreimage,
    competingTxPos,
    competingTxInclusionProof,
    competingTxWitness,
    competingTxConfirmSig,
    competingTxSpendingConditionOptionalArgs,
    txOptions
  }) {
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'challengeInFlightExitNotCanonical',
        [
          inputTx,
          inputUtxoPos,
          inFlightTx,
          inFlightTxInputIndex,
          competingTx,
          competingTxInputIndex,
          outputGuardPreimage,
          competingTxPos,
          competingTxInclusionProof,
          competingTxWitness,
          competingTxConfirmSig,
          competingTxSpendingConditionOptionalArgs
        ]
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async respondToNonCanonicalChallenge ({
    inFlightTx,
    inFlightTxPos,
    inFlightTxInclusionProof,
    txOptions
  }) {
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'respondToNonCanonicalChallenge',
        inFlightTx,
        inFlightTxPos,
        inFlightTxInclusionProof
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async challengeInFlightExitInputSpent ({
    inFlightTx,
    inFlightTxInputIndex,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    inputTx,
    inputUtxoPos,
    spendingConditionOptionalArgs,
    txOptions
  }) {
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'challengeInFlightExitInputSpent',
        [
          inFlightTx,
          inFlightTxInputIndex,
          challengingTx,
          challengingTxInputIndex,
          challengingTxWitness,
          inputTx,
          inputUtxoPos,
          spendingConditionOptionalArgs
        ]
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
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
  async challengeInFlightExitOutputSpent ({
    inFlightTx,
    inFlightTxInclusionProof,
    inFlightTxOutputPos,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    spendingConditionOptionalArgs,
    txOptions
  }) {
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'challengeInFlightExitOutputSpent',
        [
          inFlightTx,
          inFlightTxInclusionProof,
          inFlightTxOutputPos,
          challengingTx,
          challengingTxInputIndex,
          challengingTxWitness,
          spendingConditionOptionalArgs
        ]
      ),
      gas: txOptions.gas,
      gasPrice: txOptions.gasPrice
    }
    return txUtils.sendTx({
      web3: this.web3,
      txDetails,
      privateKey: txOptions.privateKey
    })
  }
}

module.exports = RootChain
