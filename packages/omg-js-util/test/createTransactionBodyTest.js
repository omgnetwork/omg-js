const transaction = require('../src/transaction')
const numberToBN = require('number-to-bn')
const assert = require('chai').assert

describe('createTransactionBody', function () {
  it('should create a transaction body from one input and give change', function () {
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

    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toAmount,
      transaction.ETH_CURRENCY
    )
    assert.equal(txBody.outputs.length, 2)
    assert.equal(txBody.outputs[0].outputGuard, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
    assert.equal(txBody.outputs[1].outputGuard, fromAddress)
    const expectedChange = numberToBN(fromUtxos[0].amount).sub(
      numberToBN(toAmount)
    )
    assert.equal(
      txBody.outputs[1].amount.toString(),
      expectedChange.toString()
    )
  })

  it('should create a transaction body from two inputs and give change', function () {
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

    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toAmount,
      transaction.ETH_CURRENCY
    )
    assert.equal(txBody.outputs.length, 2)
    assert.equal(txBody.outputs[0].outputGuard, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
    assert.equal(txBody.outputs[1].outputGuard, fromAddress)
    const expectedChange = numberToBN(fromUtxos[0].amount)
      .add(numberToBN(fromUtxos[1].amount))
      .sub(numberToBN(toAmount))
    assert.equal(
      txBody.outputs[1].amount.toString(),
      expectedChange.toString()
    )
  })

  it('should create a transaction body from two inputs for the exact amount, and not give change', function () {
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

    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toAmount,
      transaction.ETH_CURRENCY
    )
    assert.equal(txBody.outputs.length, 1)
    assert.equal(txBody.outputs[0].outputGuard, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
  })

  it('should create a transaction body from one input for the exact amount, and not give change', function () {
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

    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toAmount,
      transaction.ETH_CURRENCY
    )
    assert.equal(txBody.outputs.length, 1)
    assert.equal(txBody.outputs[0].outputGuard, toAddress)
    assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString())
  })

  it('should create a transaction body from two input included fee, and not give change for the erc20', function () {
    const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b'
    const fakeErc20 = '0xFakeERc20'
    const fromUtxos = [
      {
        txindex: 0,
        oindex: 0,
        currency: transaction.ETH_CURRENCY,
        blknum: 19774001,
        amount: 10000000000
      },
      {
        txindex: 1,
        oindex: 0,
        currency: fakeErc20,
        blknum: 19774008,
        amount: 1000
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toSendErc20Amount = 500

    const txBody = transaction.createTransactionBody(
      fromAddress,
      fromUtxos,
      toAddress,
      toSendErc20Amount,
      fakeErc20,
      undefined,
      transaction.ETH_CURRENCY,
      50
    )
    assert.equal(txBody.outputs.length, 3)
    assert.equal(txBody.outputs[0].outputGuard, toAddress)
    assert.equal(txBody.outputs[1].outputGuard, fromAddress)
    assert.equal(txBody.outputs[2].outputGuard, fromAddress)
    assert.equal(
      txBody.outputs[0].amount.toString(),
      toSendErc20Amount.toString()
    )
    assert.equal(
      txBody.outputs[1].amount.toString(),
      toSendErc20Amount.toString()
    )
    assert.equal(
      txBody.outputs[2].amount.toString(),
      (fromUtxos[0].amount - 50).toString()
    )
  })

  it('should fail to create a transaction with insufficient funds', function () {
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

    return assert.throws(
      () =>
        transaction.createTransactionBody(
          fromAddress,
          fromUtxos,
          toAddress,
          toAmount,
          transaction.ETH_CURRENCY
        ),
      Error,
      /Insufficient funds/
    )
  })

  it('should fail to create a transaction with multi currency', function () {
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
        currency: '0xerc20-1',
        blknum: 19774001,
        amount: 10
      },
      {
        txindex: 0,
        oindex: 0,
        currency: '0xerc20-2',
        blknum: 19774001,
        amount: 10
      }
    ]

    const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f'
    const toAmount = 100

    return assert.throws(
      () =>
        transaction.createTransactionBody(
          fromAddress,
          fromUtxos,
          toAddress,
          toAmount,
          transaction.ETH_CURRENCY
        ),
      Error,
      /Multiple currencies in the utxo array, only fee and to send currency is allowed./
    )
  })
})
