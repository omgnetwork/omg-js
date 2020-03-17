const chai = require('chai')
const assert = chai.assert
const utxo = require('../src/utxo')
const transaction = require('../src/transaction')

describe('UTXO utils tests', function () {
  it('should merge utxo inputs to an output', function () {
    const utxos = [
      {
        amount: 1,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 2,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 10,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      }
    ]

    const outputUtxo = utxo.mergeUtxosToOutput(utxos)
    assert.equal(outputUtxo.amount.toString(), '13')
  })

  it('should throw error if provide more than 4 utxos', function () {
    const utxos = [
      {
        amount: 1,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 2,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 10,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 11,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 15,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      }
    ]

    assert.throws(
      () => utxo.mergeUtxosToOutput(utxos),
      Error,
      /max utxos that can merge must less than 4/
    )
  })
  it('should throw error if currency is different', function () {
    const utxos = [
      {
        amount: 1,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 2,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 10,
        blknum: 1,
        creating_txhash: 'hash',
        currency: '0xabc',
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      },
      {
        amount: 11,
        blknum: 1,
        creating_txhash: 'hash',
        currency: transaction.ETH_CURRENCY,
        oindex: 1,
        otype: 1,
        owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
        spending_txhash: '0x',
        txindex: 1,
        utxo_pos: 1
      }
    ]

    assert.throws(() => utxo.mergeUtxosToOutput(utxos), Error, /all utxo currency must be the same/)
  })
})
