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

const InvalidArgumentError = require('./InvalidArgumentError')
const Web3Utils = require('web3-utils')
const rlp = require('rlp')

const MAX_INPUTS = 4
const MAX_OUTPUTS = 4

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const NULL_INPUT = { blknum: 0, txindex: 0, oindex: 0 }
const NULL_OUTPUT = { owner: NULL_ADDRESS, amount: 0, currency: NULL_ADDRESS }

const BLOCK_OFFSET = Web3Utils.toBN(1000000000)
const TX_OFFSET = 10000

function validate (arg) {
  validateInputs(arg.inputs)
  validateOutputs(arg.outputs)
}

function validateInputs (arg) {
  if (!Array.isArray(arg)) {
    throw new InvalidArgumentError('Inputs must be an array')
  }

  if (arg.length === 0 || arg.length > MAX_INPUTS) {
    throw new InvalidArgumentError(`Inputs must be an array of size > 0 and < ${MAX_INPUTS}`)
  }

  if (!arg.every(input => input.currency === arg[0].currency)) {
    throw new InvalidArgumentError('Cannot mix currencies')
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

function toArray (transactionBody) {
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
    addOutput(outputArray,
      i < transactionBody.outputs.length
        ? transactionBody.outputs[i]
        : NULL_OUTPUT)
  }

  txArray.push(outputArray)
  return txArray
}

function addInput (array, input) {
  array.push([input.blknum, input.txindex, input.oindex])
}

function addOutput (array, output) {
  array.push([
    sanitiseAddress(output.owner), // must start with '0x' to be encoded properly
    sanitiseAddress(output.currency), // must be a Number to be encoded properly
    Number(output.amount) // must start with '0x' to be encoded properly
  ])
}

function createTransactionBody (fromAddress, fromUtxos, toAddress, toAmount) {
  validateInputs(fromUtxos)
  const inputArr = fromUtxos.map(utxo => utxo)

  const totalInputValue = inputArr.reduce((acc, curr) => acc.add(Web3Utils.toBN(curr.amount.toString())), Web3Utils.toBN(0))

  const outputArr = [{
    owner: toAddress,
    amount: Number(Web3Utils.toBN(toAmount))
  }]

  if (totalInputValue.gt(Web3Utils.toBN(toAmount))) {
    // The 'change' output
    outputArr.push({
      owner: fromAddress,
      amount: Number(totalInputValue.sub(Web3Utils.toBN(toAmount)).toString())
    })
  }

  const txBody = {
    inputs: inputArr,
    outputs: outputArr
  }

  return txBody
}

function encodeUtxoPos (utxo) {
  const blk = Web3Utils.toBN(utxo.blknum).mul(BLOCK_OFFSET)
  const tx = Web3Utils.toBN(utxo.txindex).muln(TX_OFFSET)
  return blk.add(tx).addn(utxo.oindex)
}

function sanitiseAddress (address) {
  if (typeof address !== 'string' || !address.startsWith('0x')) {
    return `0x${address}`
  }
  return address
}

function encodeDepositTx (owner, amount, currency) {
  const txArray = toArray({
    inputs: [],
    outputs: [{ owner, amount, currency }]
  })

  return `0x${rlp.encode(txArray).toString('hex').toUpperCase()}`
}

module.exports = {
  NULL_ADDRESS,
  toArray,
  validate,
  createTransactionBody,
  encodeUtxoPos,
  encodeDepositTx
}
