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

const { InvalidArgumentError } = require('@omisego/omg-js-util')

const MAX_INPUTS = 2
const MAX_OUTPUTS = 2

const NULL_INPUT = { blknum: 0, txindex: 0, oindex: 0 }
const NULL_OUTPUT = { owner: '0x0000000000000000000000000000000000000000', amount: 0 }

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

  for (let i = 0; i < MAX_INPUTS; i++) {
    addInput(txArray, i < transactionBody.inputs.length
      ? transactionBody.inputs[i]
      : NULL_INPUT)
  }

  // TODO Can't mix currencies yet...
  txArray.push(Buffer.from(transactionBody.inputs[0].currency, 'hex'))

  for (let i = 0; i < MAX_OUTPUTS; i++) {
    addOutput(txArray, i < transactionBody.outputs.length
      ? transactionBody.outputs[i]
      : NULL_OUTPUT)
  }

  return txArray
}

function addInput (array, input) {
  array.push(input.blknum)
  array.push(input.txindex)
  array.push(input.oindex)
}

function addOutput (array, output) {
  array.push(output.owner)
  array.push(output.amount)
}

function createTransactionBody (fromUtxos, toAddress, toAmount) {
  validateInputs(fromUtxos)
  const inputArr = fromUtxos.map(utxo => utxo)
  //assuming a single output
  const outputArr = [{
    owner: toAddress,
    amount: Number(toAmount)
  }]

  const txBody = {
    inputs: inputArr,
    outputs: outputArr
  }

  return txBody 
}

module.exports = {
  toArray,
  validate,
  createTransactionBody
}
