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
  limitations under the License.
*/

global.Buffer = global.Buffer || require('buffer').Buffer

const InvalidArgumentError = require('./InvalidArgumentError')
const numberToBN = require('number-to-bn')
const rlp = require('rlp')
const typedData = require('./typedData')
const getToSignHash = require('./signHash')
const hexPrefix = require('./hexPrefix')

const MAX_INPUTS = 4
const MAX_OUTPUTS = 4

const BLOCK_OFFSET = numberToBN(1000000000)
const TX_OFFSET = 10000

/**
* A collection of helper functions for creating, encoding and decoding transactions.
*/
const transaction = {
  ETH_CURRENCY: typedData.NULL_ADDRESS,
  NULL_METADATA: typedData.NULL_METADATA,

  /**
  * Checks validity of a transaction
  *
  * @param {TransactionBody} tx transaction body
  * @throws {Error} an Error exception if the transaction is invalid
  *
  */
  validate: function (tx) {
    validateInputs(tx.inputs)
    validateOutputs(tx.outputs)
    validateMetadata(tx.metadata)
  },

  /**
  * Converts a transaction into an array suitable for RLP encoding
  *
  * @param {Object} typedDataMessage the transaction object
  * @return {Array[]} the transaction as an array
  *
  */
  toArray: function (typedDataMessage) {
    const txArray = []

    const inputArray = []
    addInput(inputArray, typedDataMessage.input0)
    addInput(inputArray, typedDataMessage.input1)
    addInput(inputArray, typedDataMessage.input2)
    addInput(inputArray, typedDataMessage.input3)
    txArray.push(inputArray)

    const outputArray = []
    addOutput(outputArray, typedDataMessage.output0)
    addOutput(outputArray, typedDataMessage.output1)
    addOutput(outputArray, typedDataMessage.output2)
    addOutput(outputArray, typedDataMessage.output3)
    txArray.push(outputArray)
    txArray.push(typedDataMessage.metadata)

    return txArray
  },

  /**
  * Creates and encodes a deposit transaction
  *
  * @param {string} owner the address that is making the deposit
  * @param {number} amount the amount of the deposit
  * @param {string} currency the currency (token address) of the deposit
  * @return {string} the RLP encoded deposit transaction
  *
  */
  encodeDeposit: function (owner, amount, currency) {
    const encoded = transaction.encode({
      transactionType: 1,
      inputs: [],
      outputs: [{
        outputType: 1,
        outputGuard: hexPrefix(owner),
        currency: hexPrefix(currency),
        amount
      }],
      metadata: typedData.NULL_METADATA
    })
    return encoded
  },

  /**
  * Decodes a deposit transaction
  *
  * @param {string} encodedDeposit the RLP encoded deposit transaction
  * @return {DepositTransaction} the decoded deposit transaction
  *
  */
  decodeDeposit: function (encodedDeposit) {
    const { outputs } = transaction.decodeTxBytes(encodedDeposit)
    const [{ outputGuard, amount, currency }] = outputs
    return {
      owner: outputGuard,
      amount,
      currency
    }
  },

  /**
  * RLP encodes a transaction
  *
  * @param {TransactionBody} transaction transaction object
  * @param {Object} [signedArgs] arguments object defining whether transaction is signed
  * @param {boolean} signedArgs.signed whether the transaction should be signed
  * @return {string} the RLP encoded transaction
  *
  */
  encode: function ({ transactionType, inputs, outputs, metadata, signatures }, { signed = true } = {}) {
    const txArray = [transactionType]
    signatures && signed && txArray.unshift(signatures)
    const inputArray = []
    const outputArray = []
    for (let i = 0; i < MAX_INPUTS; i++) {
      addInput(inputArray,
        i < inputs.length
          ? inputs[i]
          : typedData.NULL_INPUT)
    }
    txArray.push(inputArray)
    for (let i = 0; i < MAX_OUTPUTS; i++) {
      addOutput(outputArray,
        i < outputs.length
          ? outputs[i]
          : typedData.NULL_OUTPUT)
    }
    txArray.push(outputArray)
    txArray.push(metadata)
    return hexPrefix(rlp.encode(txArray).toString('hex'))
  },

  /**
  * Decodes an RLP encoded transaction
  *
  * @param {string} tx the RLP encoded transaction
  * @return {TransactionBody} transaction object
  *
  */
  decodeTxBytes: function (tx) {
    let inputs, outputs, transactionType, metadata, sigs
    const rawTx = Buffer.isBuffer(tx) ? tx : Buffer.from(tx.replace('0x', ''), 'hex')
    const decoded = rlp.decode(rawTx)
    switch (decoded.length) {
      case 4:
        [transactionType, inputs, outputs, metadata] = decoded
        break
      case 5:
        [sigs, transactionType, inputs, outputs, metadata] = decoded
        break
      default:
        throw new Error(`error decoding txBytes, got ${decoded}`)
    }
    return {
      ...(sigs && { sigs: sigs.map(parseString) }),
      transactionType: parseNumber(transactionType),
      inputs: inputs.map(input => transaction.decodeUtxoPos(parseString(input))),
      outputs: outputs.map(output => {
        const outputType = parseNumber(output[0])
        const outputGuard = parseString(output[1])
        const currency = parseString(output[2])
        const amount = numberToBN(parseString(output[3])).toString()
        return { outputType, outputGuard, currency, amount }
      }),
      metadata: parseString(metadata)
    }
  },

  /**
  * Creates a transaction object. It will select from the given utxos to cover the amount
  * of the transaction, sending any remainder back as change.
  *
  * @param {string} fromAddress the address of the sender
  * @param {Object[]} fromUtxos the utxos to use as transaction inputs
  * @param {string} toAddress the address of the receiver
  * @param {number} toAmount the amount to send
  * @param {string} currency the currency to send
  * @param {string} metadata the currency to send
  * @return {TransactionBody} transaction object
  * @throws {Error} Error if any of the args are invalid or given utxos cannot cover the amount
  *
  */
  createTransactionBody: function (
    fromAddress,
    fromUtxos,
    toAddress,
    toAmount,
    currency,
    metadata,
    feeAmount = 0,
    feeCurrency
  ) {
    validateInputs(fromUtxos)
    validateMetadata(metadata)
    if (!feeCurrency) {
      throw new Error('Fee currency not provided.')
    }
    if (fromUtxos.find(utxo => utxo.currency !== currency && utxo.currency !== feeCurrency)) {
      throw new Error('There are currencies in the utxo array that is not fee or currency.')
    }
    const inputArr = fromUtxos.filter(utxo => utxo.currency === currency)
    const feeArr = fromUtxos.filter(utxo => utxo.currency === feeCurrency)
    const sum = arr => arr.reduce((acc, curr) => acc.add(numberToBN(curr.amount.toString())), numberToBN(0))
    // Get the total value of the inputs
    const totalInputValue = sum(inputArr)
    const totalInputFee = sum(feeArr)
    const bnAmount = numberToBN(toAmount)
    const bnFeeAmount = numberToBN(feeAmount)
    // Check there is enough in the inputs to cover the amount
    if (totalInputValue.lt(bnAmount)) {
      throw new Error(`Insufficient funds for ${bnAmount.toString()}`)
    }

    // to sender output
    const outputArr = [{
      outputType: 1,
      outputGuard: toAddress,
      currency,
      amount: bnAmount
    }]

    if (feeCurrency !== currency && totalInputValue.gt(bnAmount)) {
      outputArr.push({
        outputType: 1,
        outputGuard: fromAddress,
        currency,
        amount: totalInputValue.sub(bnAmount)
      })
    }

    if (feeCurrency === currency && totalInputValue.gt(bnAmount.add(bnFeeAmount))) {
      outputArr.push({
        outputType: 1,
        outputGuard: fromAddress,
        currency,
        amount: totalInputValue.sub(bnAmount).sub(bnFeeAmount)
      })
    }

    // fee change
    if (feeCurrency !== currency) {
      outputArr.push({
        outputType: 1,
        outputGuard: fromAddress,
        currency: feeCurrency,
        amount: totalInputFee.sub(bnFeeAmount)
      })
    }

    const txBody = {
      inputs: fromUtxos,
      outputs: outputArr,
      metadata
    }

    return txBody
  },

  /**
  * Encodes a utxo into the format used in the RootChain contract
  * i.e. blocknum * 1000000000 + txindex * 10000 + oindex
  *
  * @param {UTXO} utxo a utxo object
  * @return {BigNumber} the encoded utxo position as a Big Number
  *
  */
  encodeUtxoPos: function (utxo) {
    const blk = numberToBN(utxo.blknum).mul(BLOCK_OFFSET)
    const tx = numberToBN(utxo.txindex).muln(TX_OFFSET)
    return blk.add(tx).addn(utxo.oindex)
  },

  /**
  * Decodes a utxo from the format used in the RootChain contract
  * i.e. blocknum * 1000000000 + txindex * 10000 + oindex
  *
  * @param {number} utxoPos the utxo position
  * @return {UTXO} a utxo object
  *
  */
  decodeUtxoPos: function (utxoPos) {
    const bn = numberToBN(utxoPos)
    const blknum = bn.div(BLOCK_OFFSET).toNumber()
    const txindex = bn.mod(BLOCK_OFFSET).divn(TX_OFFSET).toNumber()
    const oindex = bn.modn(TX_OFFSET)
    return { blknum, txindex, oindex }
  },

  /**
  * Returns the typed data for signing a transaction
  *
  * @param {TransactionBody} tx the transaction body
  * @param {string} verifyingContract the address of the RootChain contract
  * @return {TypedData} the typed data of the transaction
  *
  */
  getTypedData: function (tx, verifyingContract) {
    return typedData.getTypedData(tx, verifyingContract)
  },

  /**
  * Returns the hash of the typed data, to be signed by e.g. `ecsign`
  *
  * @param {TypedData} typedData the transaction's typed data
  * @return {Buffer} the signing hash
  *
  */
  getToSignHash: function (typedData) {
    return getToSignHash(typedData)
  },

  /**
  * Transaction metadata is of type `bytes32`. To pass a string shorter than 32 bytes it must be hex encoded and padded.
  * This method is one way of doing that.
  *
  * @param {string} str the string to be encoded and passed as metadata
  * @return {string} the encoded metadata
  *
  */
  encodeMetadata: function (str) {
    const encodedMetadata = Buffer.from(str).toString('hex').padStart(64, '0')
    return `0x${encodedMetadata}`
  },

  /**
  * Transaction metadata is of type `bytes32`. To pass a string shorter than 32 bytes it must be hex encoded and padded.
  * This method decodes a string that was encoded with encodeMetadata().
  *
  * @param {string} str the metadata string to be decoded
  * @return {string} the decoded metadata
  *
  */
  decodeMetadata: function (str) {
    const unpad = str.replace('0x', '').replace(/^0*/, '')
    return Buffer.from(unpad, 'hex').toString()
  }
}

function validateInputs (arg) {
  if (!Array.isArray(arg)) {
    throw new InvalidArgumentError('Inputs must be an array')
  }

  if (arg.length === 0 || arg.length > MAX_INPUTS) {
    throw new InvalidArgumentError(`Inputs must be an array of size > 0 and < ${MAX_INPUTS}`)
  }
}

function validateOutputs (arg) {
  if (!Array.isArray(arg)) {
    throw new InvalidArgumentError('Outputs must be an array')
  }

  if (arg.length > MAX_OUTPUTS) {
    throw new InvalidArgumentError(`Outputs must be an array of size < ${MAX_OUTPUTS}`)
  }
}

function validateMetadata (arg) {
  if (arg) {
    let invalid = false
    try {
      const hex = Buffer.from(arg.replace('0x', ''), 'hex')
      invalid = hex.length !== 32
    } catch (err) {
      invalid = true
    }
    if (invalid) {
      throw new InvalidArgumentError('Metadata must be a 32-byte hex string')
    }
  }
}

function addInput (array, input) {
  if (input.blknum !== 0) {
    const encodedPosition = transaction.encodeUtxoPos(input)
    array.push(encodedPosition)
  }
}

function addOutput (array, output) {
  if (output.amount > 0) {
    array.push([
      output.outputType,
      sanitiseAddress(output.outputGuard), // must start with '0x' to be encoded properly
      sanitiseAddress(output.currency), // must start with '0x' to be encoded properly
      numberToBN(output.amount)
    ])
  }
}

function sanitiseAddress (address) {
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    return `0x${address}`
  }
  return address
}

function parseNumber (buf) {
  return buf.length === 0 ? 0 : parseInt(buf.toString('hex'), 16)
}

function parseString (buf) {
  return buf.length === 0 ? typedData.NULL_ADDRESS : `0x${buf.toString('hex')}`
}

module.exports = transaction
