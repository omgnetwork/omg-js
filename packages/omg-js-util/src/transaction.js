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
const { uniq } = require('lodash')
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

    txArray.push(typedDataMessage.txData)
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
      txType: 1,
      inputs: [],
      outputs: [{
        outputType: 1,
        outputGuard: hexPrefix(owner),
        currency: hexPrefix(currency),
        amount
      }],
      txData: 0,
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
  encode: function ({ txType, inputs, outputs, txData, metadata, signatures }, { signed = true } = {}) {
    const txArray = [txType]
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
    txArray.push(txData)
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
    let txType, inputs, outputs, txData, metadata, sigs
    const rawTx = Buffer.isBuffer(tx) ? tx : Buffer.from(tx.replace('0x', ''), 'hex')
    const decoded = rlp.decode(rawTx)
    switch (decoded.length) {
      case 5:
        [txType, inputs, outputs, txData, metadata] = decoded
        break
      case 6:
        [sigs, txType, inputs, outputs, txData, metadata] = decoded
        break
      default:
        throw new Error(`error decoding txBytes, got ${decoded}`)
    }
    return {
      ...(sigs && { sigs: sigs.map(parseString) }),
      txType: parseNumber(txType),
      inputs: inputs.map(input => transaction.decodeUtxoPos(parseString(input))),
      outputs: outputs.map(output => {
        const outputData = output[1]
        const outputType = parseNumber(output[0])
        const outputGuard = parseString(outputData[0])
        const currency = parseString(outputData[1])
        const amount = numberToBN(parseString(outputData[2])).toString()
        return { outputType, outputGuard, currency, amount }
      }),
      txData: parseNumber(txData),
      metadata: parseString(metadata)
    }
  },

  /**
  * Creates a transaction object. It will select from the given utxos to cover the amount
  * of the transaction, sending any remainder back as change.
  *
  * @param {Object} args an arguments object
  * @param {string} args.fromAddress the address of the sender
  * @param {Object[]} args.fromUtxos the utxos to use as transaction inputs (in order of priority)
  * @param {Payment[]} args.payments payment objects specifying the outputs
  * @param {Fee} args.fee fee object specifying amount and currency
  * @param {string} args.metadata the metadata to send
  * @return {TransactionBody} transaction object
  * @throws {Error} Error if any of the args are invalid or given utxos cannot cover the amount
  *
  */
  createTransactionBody: function ({
    fromAddress,
    fromUtxos,
    payments,
    fee,
    metadata
  }) {
    validateMetadata(metadata)
    if (!fee.currency) {
      throw new Error('Fee currency not provided.')
    }

    const allPayments = [...payments, fee]
    const neededCurrencies = uniq([...payments.map(i => i.currency), fee.currency])

    function calculateChange (inputs) {
      return neededCurrencies.map(currency => {
        const needed = allPayments.reduce((acc, i) => {
          return i.currency === currency
            ? acc.add(numberToBN(i.amount))
            : acc
        }, numberToBN(0))
        const supplied = inputs.reduce((acc, i) => {
          return i.currency === currency
            ? acc.add(numberToBN(i.amount))
            : acc
        }, numberToBN(0))
        const change = supplied.sub(needed)
        return {
          currency,
          needed,
          supplied,
          change
        }
      })
    }

    // check if fromUtxos has sufficient amounts to cover payments and fees
    // compare how much we need vs how much supplied per currency
    const change = calculateChange(fromUtxos)
    for (const i of change) {
      if (i.needed.gt(i.supplied)) {
        const diff = i.needed.sub(i.supplied)
        throw new Error(`Insufficient funds. Needs ${diff.toString()} more of ${i.currency} to cover payments and fees`)
      }
    }

    // get inputs array by filtering the fromUtxos we will actually use (respecting order)
    const changeCounter = [...change]
    const inputs = fromUtxos.filter(fromUtxo => {
      const foundIndex = changeCounter.findIndex(i => i.currency === fromUtxo.currency)
      const foundItem = changeCounter[foundIndex]
      if (!foundItem || foundItem.needed.lte(numberToBN(0))) {
        return false
      }
      changeCounter[foundIndex] = {
        ...foundItem,
        needed: foundItem.needed.sub(numberToBN(fromUtxo.amount))
      }
      return true
    })
    validateInputs(inputs)

    // recalculate change with filtered fromUtxos array, and create outputs (payments + changeOutputs)
    const recalculatedChange = calculateChange(inputs)
    const changeOutputs = recalculatedChange
      .filter(i => i.change.gt(numberToBN(0)))
      .map(i => ({
        outputType: 1,
        outputGuard: fromAddress,
        currency: i.currency,
        amount: i.change
      }))
    const paymentOutputs = payments.map(i => ({
      outputType: 1,
      outputGuard: i.owner,
      currency: i.currency,
      amount: i.amount
    }))
    const outputs = [...changeOutputs, ...paymentOutputs]
    validateOutputs(outputs)

    const txBody = {
      inputs,
      outputs,
      txData: 0,
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
    if (str.startsWith('0x')) {
      return str
    }
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
    const blk = numberToBN(input.blknum).mul(BLOCK_OFFSET)
    const tx = numberToBN(input.txindex).muln(TX_OFFSET)
    const position = blk.add(tx).addn(input.oindex).toBuffer()
    const toPad = 32 - position.length
    const pads = Buffer.alloc(toPad, 0)
    const encodedPosition = Buffer.concat([pads, position])

    array.push(encodedPosition)
  }
}

function addOutput (array, output) {
  if (output.amount > 0) {
    array.push([
      output.outputType,
      [
        sanitiseAddress(output.outputGuard),
        sanitiseAddress(output.currency),
        numberToBN(output.amount)
      ]
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
