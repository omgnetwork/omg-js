const ChildChain = require('../src')
const { InvalidArgumentError } = require('@omisego/omg-js-util')
const assert = require('chai').assert

const childChain = new ChildChain('watcher_url', 'childChain_url')

describe('createTransaction', () => {
  it('should create a hex-encoded unsigned transaction', () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774001,
          'amount': 1000000000000000000
        }
      ],
      'outputs': [
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'amount': 1000000000000000000
        }
      ]
    }

    const unsignedTx = childChain.createTransaction(txBody)
    const expectedTx = '0xF8BBD4C784012DBA318080C3808080C3808080C3808080F8A4DF94F4EBBE787311BB955BB353B7A4D8B97AF8ED1C9B80880DE0B6B3A7640000EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should create a hex-encoded unsigned transaction with 4 inputs and 4 outputs', () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774001
        },
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774002
        },
        {
          'txindex': 0,
          'oindex': 1,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774002
        },
        {
          'txindex': 10,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774002
        }
      ],
      'outputs': [
        {
          'owner': '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
          'amount': 1000000000000000000
        },
        {
          'owner': '0x3272ee86d8192f59261960c9ae186063c8c9041f',
          'amount': 1000000000000000000
        },
        {
          'owner': '0x99d7b5c57c16acb24a327a37356a804a2f75dade',
          'amount': 100000000
        },
        {
          'owner': '0xbfdf85743ef16cfb1f8d4dd1dfc74c51dc496434',
          'amount': 100
        }
      ]
    }

    const unsignedTx = childChain.createTransaction(txBody)
    const expectedTx = '0xF897E0C784012DBA318080C784012DBA328080C784012DBA328001C784012DBA320A80F874DF94F4EBBE787311BB955BB353B7A4D8B97AF8ED1C9B80880DE0B6B3A7640000DF943272EE86D8192F59261960C9AE186063C8C9041F80880DE0B6B3A7640000DB9499D7B5C57C16ACB24A327A37356A804A2F75DADE808405F5E100D794BFDF85743EF16CFB1F8D4DD1DFC74C51DC4964348064'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should create a transaction with no outputs', () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774001,
          'amount': 1000000000000000000
        }
      ],
      'outputs': []
    }

    const unsignedTx = childChain.createTransaction(txBody)
    const expectedTx = '0xF8C7D4C784012DBA318080C3808080C3808080C3808080F8B0EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should fail to create a transaction with non array inputs', () => {
    const txBody = {
      'inputs': {
        'txindex': 0,
        'oindex': 0,
        'currency': '0000000000000000000000000000000000000000',
        'blknum': 19774001
      },
      'outputs': []
    }
    return assert.throws(() => childChain.createTransaction(txBody), InvalidArgumentError, /Inputs must be an array/)
  })

  it('should fail to create a transaction with 0 inputs', () => {
    const txBody = {
      'inputs': [],
      'outputs': []
    }
    return assert.throws(() => childChain.createTransaction(txBody), InvalidArgumentError, /Inputs must be an array of size/)
  })

  it('should fail to create a transaction with too many inputs', () => {
    const txBody = {
      'inputs': [{}, {}, {}, {}, {}],
      'outputs': []
    }
    return assert.throws(() => childChain.createTransaction(txBody), InvalidArgumentError, /Inputs must be an array of size/)
  })

  it('should fail to create a transaction with too many outputs', () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774001,
          'amount': 1000000000000000000
        }
      ],
      'outputs': [{}, {}, {}, {}, {}]
    }
    return assert.throws(() => childChain.createTransaction(txBody), InvalidArgumentError, /Outputs must be an array of size/)
  })
})
