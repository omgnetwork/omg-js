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

const chai = require('chai')
const assert = chai.assert
const transaction = require('../src/transaction')

describe('Transaction tests', function () {
  it('should return an encoded transaction from 1 input and 1 output', async function () {
    const txBody = {
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 19774001
        }
      ],
      outputs: [
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: 500000000000000123
        }
      ]
    }
    const unsignedTx = transaction.encode(txBody)
    const expectedTx =
      '0xf84180c8874640596164aa00f5f40194f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b9400000000000000000000000000000000000000008806f05b59d3b2006480'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should create a hex-encoded unsigned transaction with 4 inputs and 4 outputs', function () {
    const txBody = {
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 19774001
        },
        {
          txindex: 0,
          oindex: 0,
          blknum: 19774002
        },
        {
          txindex: 0,
          oindex: 1,
          blknum: 19774002
        },
        {
          txindex: 10,
          oindex: 0,
          blknum: 19774002
        }
      ],
      outputs: [
        {
          outputType: 1,
          outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          currency: '0x0000000000000000000000000000000000000000',
          amount: 1000000000000000000
        },
        {
          outputType: 1,
          outputGuard: '0x3272ee86d8192f59261960c9ae186063c8c9041f',
          currency: '0x0000000000000000000000000000000000000000',
          amount: 1000000000000000000
        },
        {
          outputType: 1,
          outputGuard: '0x99d7b5c57c16acb24a327a37356a804a2f75dade',
          currency: '0x0000000000000000000000000000000000000000',
          amount: 100000000
        },
        {
          outputType: 1,
          outputGuard: '0xbfdf85743ef16cfb1f8d4dd1dfc74c51dc496434',
          currency: '0x0000000000000000000000000000000000000000',
          amount: 100
        }
      ]
    }

    const unsignedTx = transaction.encode(txBody)
    const expectedTx =
      '0xf8ed80e0874640596164aa00874640599cff7400874640599cff7401874640599d00faa0f8c8f40194f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b940000000000000000000000000000000000000000880de0b6b3a7640000f401943272ee86d8192f59261960c9ae186063c8c9041f940000000000000000000000000000000000000000880de0b6b3a7640000f0019499d7b5c57c16acb24a327a37356a804a2f75dade9400000000000000000000000000000000000000008405f5e100ec0194bfdf85743ef16cfb1f8d4dd1dfc74c51dc4964349400000000000000000000000000000000000000006480'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should encode a transaction with no outputs', function () {
    const txBody = {
      inputs: [
        {
          txindex: 0,
          oindex: 0,
          blknum: 19774001
        }
      ],
      outputs: []
    }
    const unsignedTx = transaction.encode(txBody)
    const expectedTx = '0xcc80c8874640596164aa00c080'
    assert.equal(unsignedTx, expectedTx)
  })

  describe('encodeDeposit', function () {
    it('should return an encoded deposit transaction', async function () {
      const address = '0x854951e37c68a99a52d9e3ae15e0cb62184a613e'
      const amount = 333
      const expected =
        '0xf85301c0efee0194854951e37c68a99a52d9e3ae15e0cb62184a613e94000000000000000000000000000000000000000082014da00000000000000000000000000000000000000000000000000000000000000000'

      const encoded = transaction.encodeDeposit(
        address,
        amount,
        transaction.ETH_CURRENCY
      )
      assert.equal(encoded, expected)
    })

    it('should return an encoded deposit transaction when amount as a string', async function () {
      const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2'
      const amount = '1000000000000000000'
      const expected =
        '0xf85901c0f5f4019460c5bc2de80acda5016c1e81f61620adbc730dd2940000000000000000000000000000000000000000880de0b6b3a7640000a00000000000000000000000000000000000000000000000000000000000000000'

      const encoded = transaction.encodeDeposit(
        address,
        amount,
        transaction.ETH_CURRENCY
      )
      assert.equal(encoded, expected)
    })

    it('should return an encoded deposit transaction when currency does not start with 0x', async function () {
      const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2'
      const amount = '3000000000000000000000'
      const expected =
        '0xf85a01c0f6f5019460c5bc2de80acda5016c1e81f61620adbc730dd294000000000000000000000000000000000000000089a2a15d09519be00000a00000000000000000000000000000000000000000000000000000000000000000'

      const encoded = transaction.encodeDeposit(
        address,
        amount,
        '0000000000000000000000000000000000000000'
      )
      assert.equal(encoded, expected)
    })
  })
})
