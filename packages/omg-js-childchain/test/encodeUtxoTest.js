const chai = require('chai')
const assert = chai.assert
const transcation = require('../src/transaction/transaction')

describe('Encode UTXO tests', () => {
  it('should return the encoded utxo position', () => {
    const utxo = {
      blknum: 96035000,
      currency: '',
      oindex: 0,
      txbytes: '',
      txindex: 0
    }

    const utxoPos = transcation.encodeUtxoPos(utxo)
    assert.equal(utxoPos.toString(), '96035000000000000')
  })

  it('should return the encoded utxo position', () => {
    const utxo = {
      blknum: 96035000,
      currency: '',
      oindex: 1,
      txbytes: '',
      txindex: 7
    }

    const utxoPos = transcation.encodeUtxoPos(utxo)
    assert.equal(utxoPos.toString(), '96035000000070001')
  })

  it('should return the encoded utxo position', () => {
    const utxo = {
      blknum: 777777777,
      currency: '',
      oindex: 999,
      txbytes: '',
      txindex: 8888
    }

    const utxoPos = transcation.encodeUtxoPos(utxo)
    assert.equal(utxoPos.toString(), '777777777088880999')
  })
})
