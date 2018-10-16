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

const MAX_INPUTS = 2
const MAX_OUTPUTS = 2

const NULL_INPUT = { blknum: 0, txindex: 0, oindex: 0 }
const NULL_OUTPUT = { owner: '0x0000000000000000000000000000000000000000', amount: 0 }

function transactionToArray(transactionBody) {
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

function addInput(array, input) {
    array.push(input.blknum)
    array.push(input.txindex)
    array.push(input.oindex)
}

function addOutput(array, output) {
    array.push(output.owner)
    array.push(output.amount)
}

module.exports = transactionToArray