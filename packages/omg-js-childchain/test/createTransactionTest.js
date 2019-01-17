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
    const expectedTx = 'f8bbd4c784012dba318080c3808080c3808080c3808080f8a4df94f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b80880de0b6b3a7640000eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
    assert.equal(unsignedTx, expectedTx)
  })

  it('should create a hex-encoded unsigned transaction with 2 inputs and 2 outputs', () => {
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
        }
      ]
    }

    const unsignedTx = childChain.createTransaction(txBody)
    const expectedTx = 'f8b3d8c784012dba318080c784012dba328080c3808080c3808080f898df94f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b80880de0b6b3a7640000df943272ee86d8192f59261960c9ae186063c8c9041f80880de0b6b3a7640000eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
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
    const expectedTx = 'f8c7d4c784012dba318080c3808080c3808080c3808080f8b0eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080eb94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'
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

  it('should fail to create a transaction with mixed currencies', () => {
    const txBody = {
      'inputs': [
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000000000000000000000',
          'blknum': 19774001,
          'amount': 1000000000000000000
        },
        {
          'txindex': 0,
          'oindex': 0,
          'currency': '0000000000000000000000999999999999999999',
          'blknum': 19774001,
          'amount': 1000000000000000000
        }
      ],
      'outputs': []
    }
    return assert.throws(() => childChain.createTransaction(txBody), InvalidArgumentError, /Cannot mix currencies/)
  })
})
