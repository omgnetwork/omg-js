const transaction = require('../src/transaction')
const numberToBN = require('number-to-bn')
const assert = require('chai').assert

describe('createTransactionBody', () => {
  it('should create a transaction body from one input and give change', () => {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 1000000000000000000
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = 600000000000000000

    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, transaction.ETH_CURRENCY)
    assert.equal(txBody.outputs.length, 2)
    assert.equal(txBody.outputs[0].owner, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
    assert.equal(txBody.outputs[1].owner, fromAddress)
    const expectedChange = numberToBN(fromUtxos[0].amount).sub(numberToBN(toAmount))
    assert.equal(txBody.outputs[1].amount.toString(), expectedChange.toString())
  })

  it('should create a transaction body from two inputs and give change', () => {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10
      },
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = 16

    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, transaction.ETH_CURRENCY)
    assert.equal(txBody.outputs.length, 2)
    assert.equal(txBody.outputs[0].owner, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
    assert.equal(txBody.outputs[1].owner, fromAddress)
    const expectedChange = numberToBN(fromUtxos[0].amount).add(numberToBN(fromUtxos[1].amount)).sub(numberToBN(toAmount))
    assert.equal(txBody.outputs[1].amount.toString(), expectedChange.toString())
  })

  it('should create a transaction body from two inputs for the exact amount, and not give change', () => {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10
      },
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = 20

    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, transaction.ETH_CURRENCY)
    assert.equal(txBody.outputs.length, 1)
    assert.equal(txBody.outputs[0].owner, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
  })

  it('should create a transaction body from one input for the exact amount, and not give change', () => {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 1000000000000000000
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = fromUtxos[0].amount

    const txBody = transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, transaction.ETH_CURRENCY)
    assert.equal(txBody.outputs.length, 1)
    assert.equal(txBody.outputs[0].owner, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
  })

  it('should fail to create a transaction with insufficient funds', () => {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = 100

    return assert.throws(() => transaction.createTransactionBody(fromAddress, fromUtxos, toAddress, toAmount, transaction.ETH_CURRENCY), Error, /Insufficient funds/)
  })
})
