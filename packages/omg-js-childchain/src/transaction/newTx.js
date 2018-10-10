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

const debug = require('debug')('omg.childchain.newTransaction')

// constructor for transaction object
function Transaction (inputs, currency, outputs) {
  this.amount1 = outputs[0].amount1
  this.amount2 = outputs[1].amount2
  this.blknum1 = inputs[0].blknum1
  this.blknum2 = inputs[1].blknum2
  this.cur12 = currency
  this.newowner1 = outputs[0].newowner1
  this.newowner2 = outputs[1].newowner2
  this.oindex1 = inputs[0].oindex1
  this.oindex2 = inputs[1].oindex2
  this.txindex1 = inputs[0].txindex1
  this.txindex2 = inputs[1].txindex2
}

function newTransaction (inputs, currency, outputs) {
  let transaction = new Transaction(inputs, currency, outputs)
  debug(`new transaction: ${JSON.stringify(transaction)}`)
  return transaction
}

module.exports = newTransaction
