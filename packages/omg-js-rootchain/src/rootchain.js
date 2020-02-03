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
const erc20abi = require('human-standard-token-abi')
const BN = require('bn.js')
const {
  rootchainConstructorSchema,
  getExitTimeSchema,
  approveTokenSchema,
  depositSchema,
  startStandardExitSchema,
  challengeStandardExitSchema,
  processExitsSchema,
  hasTokenSchema,
  addTokenSchema,
  getStandardExitIdSchema,
  getInFlightExitIdSchema,
  startInFlightExitSchema,
  piggybackInFlightExitOnOutputSchema,
  piggybackInFlightExitOnInputSchema,
  challengeInFlightExitNotCanonicalSchema,
  respondToNonCanonicalChallengeSchema,
  challengeInFlightExitInputSpentSchema,
  challengeInFlightExitOutputSpentSchema,
  deleteNonPiggybackedInFlightExitSchema
} = require('./validators')
const Joi = require('@hapi/joi')

const erc20VaultAbi = require('./contracts/Erc20Vault.json')
const ethVaultAbi = require('./contracts/EthVault.json')
const paymentExitGameAbi = require('./contracts/PaymentExitGame.json')
const plasmaFrameworkAbi = require('./contracts/PlasmaFramework.json')
const priorityQueueAbi = require('./contracts/PriorityQueue.json')

const ETH_VAULT_ID = 1
const ERC20_VAULT_ID = 2
const PAYMENT_TYPE = 1

class RootChain {
  /**
  * Create a RootChain object
  *
  * @param {Object} config the rootchain configuration object
  * @param {Web3} config.web3 a web3 instance
  * @param {string} config.plasmaContractAddress the address of the PlasmaFramework contract
  * @return {RootChain} a Rootchain object
  *
  */
  constructor ({ web3, plasmaContractAddress }) {
    Joi.assert({ web3, plasmaContractAddress }, rootchainConstructorSchema)
    this.web3 = web3
    this.plasmaContractAddress = plasmaContractAddress
    this.plasmaContract = getContract(web3, plasmaFrameworkAbi.abi, plasmaContractAddress)
  }

  async getErc20Vault () {
    if (!this.erc20Vault) {
      const address = await this.plasmaContract.methods.vaults(ERC20_VAULT_ID).call()
      const contract = getContract(this.web3, erc20VaultAbi.abi, address)
      this.erc20Vault = { contract, address }
    }
    return this.erc20Vault
  }

  async getEthVault () {
    if (!this.ethVault) {
      const address = await this.plasmaContract.methods.vaults(ETH_VAULT_ID).call()
      const contract = getContract(this.web3, ethVaultAbi.abi, address)
      this.ethVault = { contract, address }
    }
    return this.ethVault
  }

  async getPaymentExitGame () {
    if (!this.paymentExitGame) {
      const address = await this.plasmaContract.methods.exitGames(PAYMENT_TYPE).call()
      const contract = getContract(this.web3, paymentExitGameAbi.abi, address)

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

  /**
   * Calculates the exit schedule required before exits can be processed and released
   *
   * @method getExitTime
   * @param {Object} args an arguments object
   * @param {number} args.exitRequestBlockNumber block number of the exit request
   * @param {number} args.submissionBlockNumber for standard exits: the block that contains the exiting UTXO, for in-flight exits: the block that contains the youngest input of the exiting transaction
   * @return {Promise<Object>} promise that resolves with the scheduled finalization unix time and the milliseconds until that time
   */
  async getExitTime ({
    exitRequestBlockNumber,
    submissionBlockNumber,
    retries = 10
  }) {
    Joi.assert({ exitRequestBlockNumber, submissionBlockNumber }, getExitTimeSchema)
    const bufferSeconds = 5
    const retryInterval = 5000

    const _minExitPeriodSeconds = await this.plasmaContract.methods.minExitPeriod().call()
    const minExitPeriodSeconds = Number(_minExitPeriodSeconds)

    const exitBlock = await this.web3.eth.getBlock(exitRequestBlockNumber)
    if (!exitBlock) {
      if (retries > 0) {
        setTimeout(() => {
          return this.getExitTime({ exitRequestBlockNumber, submissionBlockNumber, retries: retries - 1 })
        }, retryInterval)
      } else {
        throw Error(`Could not get exit request block data: ${exitRequestBlockNumber}`)
      }
    }

    const submissionBlock = await this.plasmaContract.methods.blocks(submissionBlockNumber).call()

    let scheduledFinalizationTime
    if (submissionBlockNumber % 1000 !== 0) {
      // if deposit, elevated exit priority
      scheduledFinalizationTime = Math.max(
        Number(exitBlock.timestamp) + minExitPeriodSeconds,
        Number(submissionBlock.timestamp) + minExitPeriodSeconds
      )
    } else {
      scheduledFinalizationTime = Math.max(
        Number(exitBlock.timestamp) + minExitPeriodSeconds,
        Number(submissionBlock.timestamp) + (minExitPeriodSeconds * 2)
      )
    }

    const currentUnix = Math.round((new Date()).getTime() / 1000)
    const msUntilFinalization = (scheduledFinalizationTime + bufferSeconds - currentUnix) * 1000
    return {
      scheduledFinalizationTime: scheduledFinalizationTime + bufferSeconds,
      msUntilFinalization
    }
  }

  /**
   * Retrieves the exit queue for a particular token
   *
   * @method getExitQueue
   * @param {string} token relevant queue to retrieve (defaults to ETH)
   * @return {Promise<Object[]>} promise that resolves with the exit queue
   */
  async getExitQueue (token = transaction.ETH_CURRENCY) {
    const vaultId = token === transaction.ETH_CURRENCY ? 1 : 2
    const hashed = this.web3.utils.soliditySha3(
      { t: 'uint256', v: vaultId },
      { t: 'address', v: token }
    )
    const address = await this.plasmaContract.methods.exitsQueues(hashed).call()
    const contract = getContract(this.web3, priorityQueueAbi.abi, address)
    const rawExitQueue = await contract.methods.heapList().call()

    if (rawExitQueue && rawExitQueue.length) {
      // remove the first element since it is always 0 (because heap lists start from index 1)
      const exitQueuePriorities = rawExitQueue.slice(1)
      const exitQueue = exitQueuePriorities.map(_priority => {
        const priority = _priority.toString()
        const asBN = new BN(priority)
        // turn the uint256 priority into binary
        const binary = asBN.toString(2, 256)

        // split the bits into their necessary data
        // https://github.com/omisego/plasma-contracts/blob/master/plasma_framework/contracts/src/framework/utils/ExitPriority.sol#L16
        const exitableAtBinary = binary.substr(0, 42)
        const exitIdBinary = binary.substr(96, 160)

        // use BN to turn binary back into the format we want
        const exitableAt = new BN(exitableAtBinary, 2)
        const exitId = new BN(exitIdBinary, 2)

        return {
          priority,
          exitableAt: exitableAt.toString(),
          exitId: exitId.toString()
        }
      })
      return exitQueue
    } else {
      return []
    }
  }

  /**
   * Approve ERC20 for deposit
   *
   * @method approveToken
   * @param {Object} args an arguments object
   * @param {string} args.erc20Address address of the ERC20 token
   * @param {number} args.amount amount of ERC20 to approve to deposit
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async approveToken ({ erc20Address, amount, txOptions }) {
    Joi.assert({ erc20Address, amount, txOptions }, approveTokenSchema)
    const { address: spender } = await this.getErc20Vault()
    const erc20Contract = getContract(this.web3, erc20abi, erc20Address)
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
   * Deposit to the rootchain
   *
   * @method deposit
   * @param {Object} args an arguments object
   * @param {number} args.amount amount to deposit
   * @param {string} [args.currency] the token address of the deposit (defaults to ETH)
   * @param {TransactionOptions} args.txOptions transaction options
   * @param {TransactionCallbacks} [args.callbacks] callbacks to events from the transaction lifecycle
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async deposit ({
    amount,
    currency = transaction.ETH_CURRENCY,
    txOptions,
    callbacks
  }) {
    Joi.assert({ amount, currency, txOptions, callbacks }, depositSchema)
    const isEth = currency === transaction.ETH_CURRENCY
    const { address, contract } = isEth ? await this.getEthVault() : await this.getErc20Vault()
    const depositTx = transaction.encodeDeposit(txOptions.from, amount, currency)
    const txDetails = {
      from: txOptions.from,
      to: address,
      ...isEth ? { value: amount } : {},
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
   * Get standard exit id to use when processing a standard exit
   *
   * @method getStandardExitId
   * @param {Object} args an arguments object
   * @param {string} args.txBytes txBytes from the standard exit
   * @param {number} args.utxoPos the UTXO position of the UTXO being exited
   * @param {boolean} args.isDeposit whether the standard exit is of a deposit UTXO
   * @return {Promise<string>} promise that resolves with the exitId
   */
  async getStandardExitId ({ txBytes, utxoPos, isDeposit }) {
    Joi.assert({ txBytes, utxoPos, isDeposit }, getStandardExitIdSchema)
    const { contract } = await this.getPaymentExitGame()
    return contract.methods.getStandardExitId(isDeposit, txBytes, utxoPos).call()
  }

  /**
   * Get inflight exit id to use when processing an inflight exit
   *
   * @method getInFlightExitId
   * @param {Object} args an arguments object
   * @param {string} args.txBytes txBytes from the inflight exit
   * @return {Promise<string>} promise that resolves with the exitId
   */
  async getInFlightExitId ({ txBytes }) {
    Joi.assert({ txBytes }, getInFlightExitIdSchema)
    const { contract } = await this.getPaymentExitGame()
    return contract.methods.getInFlightExitId(txBytes).call()
  }

  /**
   * Starts a standard withdrawal of a given output. Uses output-age priority
   *
   * @method startStandardExit
   * @param {Object} args an arguments object
   * @param {number} args.utxoPos identifier of the exiting output
   * @param {string} args.outputTx RLP encoded transaction that created the exiting output
   * @param {string} args.inclusionProof a Merkle proof showing that the transaction was included
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async startStandardExit ({ utxoPos, outputTx, inclusionProof, txOptions }) {
    Joi.assert(
      { utxoPos, outputTx, inclusionProof, txOptions },
      startStandardExitSchema
    )
    const { contract, address, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'startStandardExit',
        [
          utxoPos.toString(),
          outputTx,
          inclusionProof
        ]
      ),
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
   * Blocks a standard exit by showing the exiting output was spent
   *
   * @method challengeStandardExit
   * @param {Object} args an arguments object
   * @param {number} args.standardExitId identifier of the exiting output
   * @param {string} args.exitingTx RLP encoded transaction that is exiting
   * @param {string} args.challengeTx RLP encoded transaction that spends the exiting output
   * @param {number} args.inputIndex which input to the challenging tx corresponds to the exiting output
   * @param {string} args.challengeTxSig signature from the exiting output owner over the spend
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
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
      data: txUtils.getTxData(
        this.web3,
        contract,
        'challengeStandardExit',
        [
          exitId,
          exitingTx,
          challengeTx,
          inputIndex,
          challengeTxSig
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
   * Processes any exit that has completed the challenge period
   *
   * @method processExits
   * @param {Object} args an arguments object
   * @param {string} args.token an address of the token to exit
   * @param {string} args.exitId the exit id
   * @param {number} args.maxExitsToProcess the max number of exits to process
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async processExits ({ token, exitId, maxExitsToProcess, txOptions }) {
    Joi.assert({ token, exitId, maxExitsToProcess, txOptions }, processExitsSchema)
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
   *
   * @method hasToken
   * @param {string} token address of the token to check
   * @return {Promise<boolean>} promise that resolves with whether an exit queue exists for this token
   */
  hasToken (token) {
    Joi.assert(token, hasTokenSchema)
    const vaultId = token === transaction.ETH_CURRENCY ? 1 : 2
    return this.plasmaContract.methods.hasExitQueue(vaultId, token).call()
  }

  /**
   * Adds a token to the Plasma chain. Tokens must be added in order to be able to exit them
   *
   * @method addToken
   * @param {Object} args an arguments object
   * @param {string} args.token address of the token to process
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   * @throws an exception if the token has already been added
   */
  async addToken ({ token, txOptions }) {
    Joi.assert({ token, txOptions }, addTokenSchema)
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
   * Starts an exit for an in-flight transaction
   *
   * @method startInFlightExit
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction
   * @param {string[]} args.inputTxs transactions that created the inputs to the in-flight transaction
   * @param {number[]} args.inputUtxosPos utxo positions of the inputs
   * @param {string[]} args.inputTxsInclusionProofs merkle proofs that show the input-creating transactions are valid
   * @param {string[]} args.inFlightTxSigs in-flight transaction witnesses
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async startInFlightExit ({
    inFlightTx,
    inputTxs,
    inputUtxosPos,
    inputTxsInclusionProofs,
    inFlightTxSigs,
    txOptions
  }) {
    Joi.assert({
      inFlightTx,
      inputTxs,
      inputUtxosPos,
      inputTxsInclusionProofs,
      inFlightTxSigs,
      txOptions
    }, startInFlightExitSchema)
    const { address, contract, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(this.web3, contract, 'startInFlightExit', [
        inFlightTx,
        inputTxs,
        inputUtxosPos,
        inputTxsInclusionProofs,
        inFlightTxSigs
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
   * Allows a user to piggyback onto an in-flight transaction
   *
   * @method piggybackInFlightExitOnOutput
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction
   * @param {number} args.outputIndex index of the input/output to piggyback (0-7)
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async piggybackInFlightExitOnOutput ({
    inFlightTx,
    outputIndex,
    txOptions
  }) {
    Joi.assert({
      inFlightTx,
      outputIndex,
      txOptions
    }, piggybackInFlightExitOnOutputSchema)

    const { address, contract, bonds } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'piggybackInFlightExitOnOutput',
        [
          inFlightTx,
          outputIndex
        ]
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
   * Allows a user to piggyback onto an in-flight transaction
   *
   * @method piggybackInFlightExitOnInput
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction
   * @param {number} args.inputIndex index of the input/output to piggyback (0-7)
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async piggybackInFlightExitOnInput ({ inFlightTx, inputIndex, txOptions }) {
    Joi.assert({ inFlightTx, inputIndex, txOptions }, piggybackInFlightExitOnInputSchema)
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
   * Attempts to prove that an in-flight exit is not canonical
   *
   * @method challengeInFlightExitNotCanonical
   * @param {Object} args an arguments object
   * @param {string} args.inputTx the input transaction
   * @param {number} args.inputUtxoPos input utxo position
   * @param {string} args.inFlightTx the in-flight transaction
   * @param {number} args.inFlightTxInputIndex index of the double-spent input in the in-flight transaction
   * @param {string} args.competingTx RLP encoded transaction that spent the input
   * @param {number} args.competingTxInputIndex index of the double-spent input in the competing transaction
   * @param {number} args.competingTxPos position of the competing transaction
   * @param {string} args.competingTxInclusionProof proof that the competing transaction was included
   * @param {string} args.competingTxWitness competing transaction witness
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async challengeInFlightExitNotCanonical ({
    inputTx,
    inputUtxoPos,
    inFlightTx,
    inFlightTxInputIndex,
    competingTx,
    competingTxInputIndex,
    competingTxPos,
    competingTxInclusionProof,
    competingTxWitness,
    txOptions
  }) {
    Joi.assert({
      inputTx,
      inputUtxoPos,
      inFlightTx,
      inFlightTxInputIndex,
      competingTx,
      competingTxInputIndex,
      competingTxPos,
      competingTxInclusionProof,
      competingTxWitness,
      txOptions
    }, challengeInFlightExitNotCanonicalSchema)
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
          competingTxPos,
          competingTxInclusionProof,
          competingTxWitness
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
   * Allows a user to respond to competitors to an in-flight exit by showing the transaction is included
   *
   * @method respondToNonCanonicalChallenge
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction being exited
   * @param {number} args.inFlightTxPos position of the in-flight transaction in the chain
   * @param {string} args.inFlightTxInclusionProof proof that the in-flight transaction is included before the competitor
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async respondToNonCanonicalChallenge ({
    inFlightTx,
    inFlightTxPos,
    inFlightTxInclusionProof,
    txOptions
  }) {
    Joi.assert({
      inFlightTx,
      inFlightTxPos,
      inFlightTxInclusionProof,
      txOptions
    }, respondToNonCanonicalChallengeSchema)
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
   * Removes an input from list of exitable outputs in an in-flight transaction
   *
   * @method challengeInFlightExitInputSpent
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction being exited
   * @param {number} args.inFlightTxInputIndex input that's been spent
   * @param {string} args.challengingTx the challenging transaction
   * @param {number} args.challengingTxInputIndex challenging transaction input index
   * @param {string} args.challengingTxWitness challenging transaction witness
   * @param {string} args.inputTx the input transaction
   * @param {number} args.inputUtxoPos input utxo position
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async challengeInFlightExitInputSpent ({
    inFlightTx,
    inFlightTxInputIndex,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    inputTx,
    inputUtxoPos,
    txOptions
  }) {
    Joi.assert({
      inFlightTx,
      inFlightTxInputIndex,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      inputTx,
      inputUtxoPos,
      txOptions
    }, challengeInFlightExitInputSpentSchema)
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
          inputUtxoPos
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
   * Removes an output from list of exitable outputs in an in-flight transaction
   *
   * @method challengeInFlightExitOutputSpent
   * @param {Object} args an arguments object
   * @param {string} args.inFlightTx RLP encoded in-flight transaction being exited
   * @param {string} args.inFlightTxInclusionProof inclusion proof
   * @param {number} args.inFlightTxOutputPos output that's been spent
   * @param {string} args.challengingTx challenging transaction
   * @param {number} args.challengingTxInputIndex input index of challenging transaction
   * @param {string} args.challengingTxWitness witness of challenging transaction
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async challengeInFlightExitOutputSpent ({
    inFlightTx,
    inFlightTxInclusionProof,
    inFlightTxOutputPos,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    txOptions
  }) {
    Joi.assert({
      inFlightTx,
      inFlightTxInclusionProof,
      inFlightTxOutputPos,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      txOptions
    }, challengeInFlightExitOutputSpentSchema)
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
          challengingTxWitness
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
   * Deletes an in-flight exit if the first phase has passed and nobody has piggybacked the exit
   *
   * @method deleteNonPiggybackedInFlightExit
   * @param {Object} args an arguments object
   * @param {string} args.exitId the exit id
   * @param {TransactionOptions} args.txOptions transaction options
   * @return {Promise<TransactionReceipt>} promise that resolves with a transaction receipt
   */
  async deleteNonPiggybackedInFlightExit ({ exitId, txOptions }) {
    Joi.assert({ exitId, txOptions }, deleteNonPiggybackedInFlightExitSchema)
    const { address, contract } = await this.getPaymentExitGame()
    const txDetails = {
      from: txOptions.from,
      to: address,
      data: txUtils.getTxData(
        this.web3,
        contract,
        'deleteNonPiggybackedInFlightExit',
        exitId
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

function getContract (web3, abi, address) {
  const isLegacyWeb3 = web3.version.api && web3.version.api.startsWith('0.2')
  if (isLegacyWeb3) {
    return web3.eth.contract(abi).at(address)
  }
  return new web3.eth.Contract(abi, address)
}

module.exports = RootChain
