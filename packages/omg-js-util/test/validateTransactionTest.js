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

// testing ETH function
const chai = require('chai')
const assert = chai.assert
const transaction = require('../src/transaction')
const InvalidArgumentError = require('../src/InvalidArgumentError')

describe('Validate Transaction tests', () => {
  it('should fail to create a transaction with non array inputs', () => {
    const txBody = {
      inputs: {
        txindex: 0,
        oindex: 0,
        currency: '0000000000000000000000000000000000000000',
        blknum: 19774001
      },
      outputs: []
    }
    return assert.throws(() => transaction.validate(txBody), InvalidArgumentError, /Inputs must be an array/)
  })

  it('should fail to create a transaction with 0 inputs', () => {
    const txBody = {
      inputs: [],
      outputs: []
    }
    return assert.throws(() => transaction.validate(txBody), InvalidArgumentError, /Inputs must be an array of size/)
  })

  it('should fail to create a transaction with too many inputs', () => {
    const txBody = {
      inputs: [{}, {}, {}, {}, {}],
      outputs: []
    }
    return assert.throws(() => transaction.validate(txBody), InvalidArgumentError, /Inputs must be an array of size/)
  })

  it('should fail to create a transaction with too many outputs', () => {
    const txBody = {
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          currency: '0000000000000000000000000000000000000000',
          blknum: 19774001,
          amount: 1000000000000000000
        }
      ],
      outputs: [{}, {}, {}, {}, {}]
    }
    return assert.throws(() => transaction.validate(txBody), InvalidArgumentError, /Outputs must be an array of size/)
  })
})
