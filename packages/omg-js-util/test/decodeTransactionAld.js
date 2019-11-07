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

// testing ETH function
const chai = require('chai')
const assert = chai.assert
const transaction = require('../src/transaction')

describe.only('decodeTransaction', () => {
  it('should decode encoded deposit', async () => {
    const owner = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const amount = 10
    const currency = '0x0000000000000000000000000000000000000000'

    const encodedTx = transaction.encodeDeposit(owner, amount, currency)
    const decoded = transaction.decodePaymentTransaction(encodedTx)
    assert.deepEqual(decoded, {
      transactionType: 1,
      inputs: [],
      outputs: [
        {
          outputType: 1,
          amount: 10,
          outputGuard: owner,
          currency
        }
      ],
      metadata: '0x0000000000000000000000000000000000000000000000000000000000000000'
    })
  })
})
