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

global.Buffer = global.Buffer || require('buffer').Buffer

const InvalidArgumentError = require('./InvalidArgumentError')
const numberToBN = require('number-to-bn')
const rlp = require('rlp')
const getTypedData = require('./typedData')
const getToSignHash = require('./signHash')

const MAX_INPUTS = 4
const MAX_OUTPUTS = 4

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const NULL_INPUT = { blknum: 0, txindex: 0, oindex: 0 }
const NULL_OUTPUT = { owner: NULL_ADDRESS, currency: NULL_ADDRESS, amount: 0 }

const BLOCK_OFFSET = numberToBN(1000000000)
const TX_OFFSET = 10000

/**
* A collection of helper functions for creating, encoding and decoding transactions.
*/
const transaction = {
  ETH_CURRENCY: NULL_ADDRESS,

  /**
  * Checks validity of a transaction
  *
  *@param {Object} tx the url of the watcher server
  *@throws an InvalidArgumentError exception if the transaction invalid
  *
  */
  validate: function (tx) {
    validateInputs(tx.inputs)
    validateOutputs(tx.outputs)
  },

  /**
  * RLP encodes a transaction
  *
  *@param {Object} transactionBody the transaction object
  *@returns the RLP encoded transaction
  *
  */
  encode: function (transactionBody) {
    const txArray = []

    const inputArray = []
    for (let i = 0; i < MAX_INPUTS; i++) {
      addInput(inputArray,
        i < transactionBody.inputs.length
          ? transactionBody.inputs[i]
          : NULL_INPUT)
    }

    txArray.push(inputArray)

    const outputArray = []
    for (let i = 0; i < MAX_OUTPUTS; i++) {
      addOutputWithCurrency(outputArray,
        i < transactionBody.outputs.length
          ? transactionBody.outputs[i]
          : NULL_OUTPUT)
    }

    txArray.push(outputArray)
    return `0x${rlp.encode(txArray).toString('hex').toUpperCase()}`
  },

  /**
  * Converts a transaction into an array suitable for RLP encoding
  *
  *@param {Object} typedDataMessage the transaction object
  *@returns the transaction as an array
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

    // NB Currently outputs havce a 'token' member instead of 'currency'. 
    // This is likely to change in the future
    const outputArray = []
    addOutputWithToken(outputArray, typedDataMessage.output0)
    addOutputWithToken(outputArray, typedDataMessage.output1)
    addOutputWithToken(outputArray, typedDataMessage.output2)
    addOutputWithToken(outputArray, typedDataMessage.output3)
    txArray.push(outputArray)

    return txArray
  },

  /**
  * Creates and encodes a deposit transaction
  *
  *@param {string} owner the address that is making the deposit
  *@param {Object} amount the amount of the deposit
  *@param {Object} currency the currency (token address) of the deposit
  *@returns the RLP encoded deposit transaction
  *
  */
  encodeDeposit: function (owner, amount, currency) {
    return this.encode({
      inputs: [],
      outputs: [{ owner, amount, currency }]
    })
  },

  /**
  * Decodes an RLP encoded transaction
  *
  *@param {string} tx the RLP encoded transaction
  *@returns the transaction object
  *
  */
  decode: function (tx) {
    let inputs, outputs, sigs
    const decoded = rlp.decode(Buffer.from(tx.replace('0x', ''), 'hex'))
    if (decoded.length === 2) {
      inputs = decoded[0]
      outputs = decoded[1]
    } else if (decoded.length === 3) {
      sigs = decoded[0]
      inputs = decoded[1]
      outputs = decoded[2]
    }

    return {
      sigs,
      inputs: inputs.map(input => {
        const blknum = parseNumber(input[0])
        const txindex = parseNumber(input[1])
        const oindex = parseNumber(input[2])
        return { blknum, txindex, oindex }
      }),
      outputs: outputs.map(output => {
        const owner = parseString(output[0])
        const currency = parseString(output[1])
        const amount = parseNumber(output[2])
        return { owner, currency, amount }
      })
    }
  },

  /**
  * Creates a transaction object. It will select from the given utxos to cover the amount
  * of the transaction, sending any remainder back as change.
  *
  *@param {string} fromAddress the address of the sender
  *@param {string} fromUtxos the utxos to use as transaction inputs
  *@param {string} toAddress the address of the receiver
  *@param {string} toAmount the amount to send
  *@param {string} currency the currency to send
  *@returns the transaction object
  *@throws InvalidArgumentError if any of the args are invalid
  *@throws Error if the given utxos cannot cover the amount
  *
  */
  createTransactionBody: function (fromAddress, fromUtxos, toAddress, toAmount, currency) {
    validateInputs(fromUtxos)
    let inputArr = fromUtxos.filter(utxo => utxo.currency === currency)

    // We can use a maximum of 4 inputs, so just take the largest 4 inputs and try to cover the amount with them
    // TODO Be more clever about this...
    if (inputArr.length > 4) {
      inputArr.sort((a, b) => {
        const diff = numberToBN(a.amount).sub(numberToBN(b.amount))
        return Number(diff.toString())
      })
      inputArr = inputArr.slice(0, 4)
    }

    // Get the total value of the inputs
    const totalInputValue = inputArr.reduce((acc, curr) => acc.add(numberToBN(curr.amount.toString())), numberToBN(0))

    const bnAmount = numberToBN(toAmount)
    // Check there is enough in the inputs to cover the amount
    if (totalInputValue.lt(bnAmount)) {
      throw new Error(`Insufficient funds for ${bnAmount.toString()}`)
    }

    const outputArr = [{
      owner: toAddress,
      currency,
      amount: bnAmount
    }]

    if (totalInputValue.gt(bnAmount)) {
      // If necessary add a 'change' output
      outputArr.push({
        owner: fromAddress,
        currency,
        amount: totalInputValue.sub(bnAmount)
      })
    }

    const txBody = {
      inputs: inputArr,
      outputs: outputArr
    }

    return txBody
  },

  encodeUtxoPos: function (utxo) {
    const blk = numberToBN(utxo.blknum).mul(BLOCK_OFFSET)
    const tx = numberToBN(utxo.txindex).muln(TX_OFFSET)
    return blk.add(tx).addn(utxo.oindex)
  },

  decodeUtxoPos: function (utxoPos) {
    const bn = numberToBN(utxoPos)
    const blknum = bn.div(BLOCK_OFFSET).toNumber()
    const txindex = bn.mod(BLOCK_OFFSET).divn(TX_OFFSET).toNumber()
    const oindex = bn.modn(TX_OFFSET)
    return { blknum, txindex, oindex }
  },

  getTypedData: function (chainId, tx) {
    return getTypedData(chainId, tx)
  },

  signHash: function (typedData) {
    return getToSignHash(typedData)
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

function addInput (array, input) {
  array.push([input.blknum, input.txindex, input.oindex])
}

function addOutputWithToken (array, output) {
  array.push([
    sanitiseAddress(output.owner), // must start with '0x' to be encoded properly
    sanitiseAddress(output.token), // must start with '0x' to be encoded properly
    // If amount is 0 it should be encoded as '0x80' (empty byte array)
    // If it's non zero, it should be a BN to avoid precision loss
    output.amount === 0 ? 0 : numberToBN(output.amount)
  ])
}

function addOutputWithCurrency (array, output) {
  array.push([
    sanitiseAddress(output.owner), // must start with '0x' to be encoded properly
    sanitiseAddress(output.currency), // must start with '0x' to be encoded properly
    // If amount is 0 it should be encoded as '0x80' (empty byte array)
    // If it's non zero, it should be a BN to avoid precision loss
    output.amount === 0 ? 0 : numberToBN(output.amount)
  ])
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
  return buf.length === 0 ? NULL_ADDRESS : `0x${buf.toString('hex')}`
}

module.exports = transaction
