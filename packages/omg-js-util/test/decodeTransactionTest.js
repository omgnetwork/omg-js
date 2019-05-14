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
const sign = require('../src/sign')
const rlp = require('rlp')

describe('decodeTransaction', () => {
  it('should decode an encoded unsigned transaction with inputs and outputs', async () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'blknum': 12
        },
        {
          'txindex': 4579,
          'oindex': 13,
          'blknum': 9821314
        }
      ],
      'outputs': [
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'amount': 1
        },
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0x0000000000000000000000000000000000000000',
          'amount': 4567
        },
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0x0000000000000000000000000000000000000000',
          'amount': 89008900
        },
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0x0000000000000000000000000000000000000000',
          'amount': 1234567890123456
        }
      ]
    }

    const encodedTx = transaction.encode(txBody)
    const decoded = transaction.decode(encodedTx)
    assert(decoded.inputs)
    assert(decoded.outputs)
    assert.isUndefined(decoded.sigs)
    txBody.inputs.forEach(input => assert.deepInclude(decoded.inputs, input))
    txBody.outputs.forEach(output => assert.deepInclude(decoded.outputs, output))
  })

  it('should decode an encoded unsigned transaction with only inputs', async () => {
    const txBody = {
      inputs: [
        {
          'txindex': 0,
          'oindex': 0,
          'blknum': 12
        },
        {
          'txindex': 4579,
          'oindex': 13,
          'blknum': 9821314
        }
      ],
      outputs: []
    }

    const encodedTx = transaction.encode(txBody)
    const decoded = transaction.decode(encodedTx)
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

  it.skip('should decode an encoded signed transaction with only inputs', async () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'blknum': 12
        },
        {
          'txindex': 4579,
          'oindex': 13,
          'blknum': 9821314
        }
      ],
      outputs: []
    }

    const encodedTx = transaction.encode(txBody)
    const key = 'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f'
    const signatures = sign(encodedTx, [key, key])
    const decodedTx = rlp.decode(Buffer.from(encodedTx.replace('0x', ''), 'hex'))
    const signedTx = [signatures, ...decodedTx]
    const signedEncoded = rlp.encode(signedTx).toString('hex')

    const decoded = transaction.decode(signedEncoded)
    assert.hasAllKeys(decoded, ['sigs', 'inputs', 'outputs'])
    txBody.inputs.forEach(input => assert.deepInclude(decoded.inputs, input))
    decoded.outputs.forEach(output => {
      assert.deepEqual(output, {
        amount: 0,
        owner: '0x0000000000000000000000000000000000000000',
        currency: transaction.ETH_CURRENCY
      })
    })
  })

  it.skip('should decode an encoded signed transaction with inputs and outputs', async () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'blknum': 12
        },
        {
          'txindex': 4579,
          'oindex': 13,
          'blknum': 9821314
        }
      ],
      outputs: [
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'amount': 1
        },
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'currency': '0x0000000000000000000000000000000000000000',
          'amount': 4567
        }]
    }

    const encodedTx = transaction.encode(txBody)
    const key = 'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f'
    const signatures = sign(encodedTx, [key, key])
    const decodedTx = rlp.decode(Buffer.from(encodedTx.replace('0x', ''), 'hex'))
    const signedTx = [signatures, ...decodedTx]
    const signedEncoded = rlp.encode(signedTx).toString('hex')

    const decoded = transaction.decode(signedEncoded)
    assert.hasAllKeys(decoded, ['sigs', 'inputs', 'outputs'])
    txBody.inputs.forEach(input => assert.deepInclude(decoded.inputs, input))
    txBody.outputs.forEach(output => assert.deepInclude(decoded.outputs, output))
  })
})
