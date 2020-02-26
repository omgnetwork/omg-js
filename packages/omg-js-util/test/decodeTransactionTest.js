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
const sign = require('../src/sign')
const rlp = require('rlp')

describe('Decode transaction tests', function () {
  it('should decode an encoded unsigned transaction with inputs and outputs', async function () {
    const txBody = {
      txType: 1,
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 12
        },
        {
          txindex: 4579,
          oindex: 13,
          blknum: 9821314
        }
      ],
      outputs: [
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          amount: '1'
        },
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: '4567'
        },
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: '89008900'
        },
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: '1234567890123456'
        }
      ],
      txData: 0,
      metadata: transaction.NULL_METADATA
    }

    const encodedTx = transaction.encode(txBody)
    const decoded = transaction.decodeTxBytes(encodedTx)
    assert.isUndefined(decoded.sigs)
    assert.deepEqual(txBody, decoded)
  })

  it('should decode an encoded unsigned transaction with only inputs', async function () {
    const txBody = {
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 12
        },
        {
          txindex: 4579,
          oindex: 13,
          blknum: 9821314
        }
      ],
      outputs: [],
      metadata: transaction.NULL_METADATA
    }

    const encodedTx = transaction.encode(txBody)
    const decoded = transaction.decodeTxBytes(encodedTx)
    assert(decoded.inputs)
    assert(decoded.outputs)
    assert.isUndefined(decoded.sigs)
    txBody.inputs.forEach(input => assert.deepInclude(decoded.inputs, input))
    decoded.outputs.forEach(output => {
      assert.deepEqual(output, {
        amount: 0,
        owner: '0x0000000000000000000000000000000000000000',
        currency: transaction.ETH_CURRENCY
      })
    })
  })

  it('should decode an encoded signed transaction with only inputs', async function () {
    const txBody = {
      txType: 1,
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 12
        },
        {
          txindex: 4579,
          oindex: 13,
          blknum: 9821314
        }
      ],
      outputs: [],
      txData: 0,
      metadata: transaction.NULL_METADATA
    }
    const key =
      'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f'
    const plasmaContractAddress = '0xa1d683a00f63dda0cde68349ebfd38513d79433f'
    const typedData = transaction.getTypedData(txBody, plasmaContractAddress)
    const toSign = transaction.getToSignHash(typedData)
    const signatures = sign(toSign, [key, key])
    const toEndcode = [
      signatures,
      typedData.message.txType,
      ...transaction.toArray(typedData.message)
    ]
    const signedEncoded = rlp.encode(toEndcode)

    const decoded = transaction.decodeTxBytes(signedEncoded)
    assert.containsAllKeys(decoded, [
      'sigs',
      'inputs',
      'outputs',
      'txType',
      'txData',
      'metadata'
    ])
    assert.deepEqual({ ...txBody, sigs: signatures }, decoded)
  })

  it('should decode an encoded signed transaction with inputs and outputs', async function () {
    const txBody = {
      txType: 1,
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 12
        },
        {
          txindex: 4579,
          oindex: 13,
          blknum: 9821314
        }
      ],
      outputs: [
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          amount: '1'
        },
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: '4567'
        }
      ],
      txData: 0,
      metadata: transaction.NULL_METADATA
    }
    const key =
      'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f'
    const plasmaContractAddress = '0xa1d683a00f63dda0cde68349ebfd38513d79433f'
    const typedData = transaction.getTypedData(txBody, plasmaContractAddress)
    const toSign = transaction.getToSignHash(typedData)
    const signatures = sign(toSign, [key, key])
    const toEndcode = [
      signatures,
      typedData.message.txType,
      ...transaction.toArray(typedData.message)
    ]
    const signedEncoded = rlp.encode(toEndcode)

    const decoded = transaction.decodeTxBytes(signedEncoded)
    assert.containsAllKeys(decoded, [
      'sigs',
      'inputs',
      'outputs',
      'txType',
      'txData',
      'metadata'
    ])
    assert.deepEqual({ ...txBody, sigs: signatures }, decoded)
  })

  it('should decode encoded deposit to raw', async function () {
    const owner = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const amount = '10'
    const currency = '0x0000000000000000000000000000000000000000'

    const encodedTx = transaction.encodeDeposit(owner, amount, currency)
    const decoded = transaction.decodeTxBytes(encodedTx)
    assert.deepEqual(decoded, {
      txType: 1,
      inputs: [],
      outputs: [
        {
          outputType: 1,
          amount: '10',
          outputGuard: owner,
          currency
        }
      ],
      txData: 0,
      metadata:
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    })
  })

  it('should decode encoded deposit', async function () {
    const owner = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const amount = '10'
    const currency = '0x0000000000000000000000000000000000000000'
    const encodedTx = transaction.encodeDeposit(owner, amount, currency)
    const decoded = transaction.decodeDeposit(encodedTx)
    assert.deepEqual(decoded, {
      owner,
      amount,
      currency
    })
  })
})
