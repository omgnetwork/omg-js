const rlp = require('rlp')
const { BN } = require('openzeppelin-test-helpers')
const utils = require('web3-utils')

const EMPTY_BYTES_32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const TransactionTypes = {
  PLASMA_DEPOSIT: 1
}

class PaymentTransactionOutput {
  constructor (type, amount, owner, token) {
    this.outputType = type
    this.outputGuard = owner
    this.token = token
    this.amount = amount
  }

  formatForRlpEncoding () {
    if (this.amount instanceof BN) {
      return [
        this.outputType,
        this.outputGuard,
        this.token,
        utils.numberToHex(this.amount)
      ]
    }
    return [this.outputType, this.outputGuard, this.token, +this.amount]
  }

  rlpEncoded () {
    return rlp.encode(this.formatForRlpEncoding())
  }

  static parseFromContractOutput (output) {
    const amount = parseInt(output.amount, 10)
    const outputType = parseInt(output.outputType, 10)
    return new PaymentTransactionOutput(
      outputType,
      amount,
      output.outputGuard,
      output.token
    )
  }
}

class PaymentTransaction {
  constructor (transactionType, inputs, outputs, metaData = EMPTY_BYTES_32) {
    this.transactionType = transactionType
    this.inputs = inputs
    this.outputs = outputs
    this.metaData = metaData
  }

  rlpEncoded () {
    const tx = [this.transactionType]
    tx.push(this.inputs)
    tx.push(PaymentTransaction.formatForRlpEncoding(this.outputs))
    tx.push(this.metaData)

    return rlp.encode(tx)
  }

  static formatForRlpEncoding (items) {
    return items.map(item => item.formatForRlpEncoding())
  }

  isDeposit () {
    return this.inputs === []
  }
}

class PlasmaDepositTransaction extends PaymentTransaction {
  constructor (output, metaData = EMPTY_BYTES_32) {
    super(TransactionTypes.PLASMA_DEPOSIT, [], [output], metaData)
  }
}

module.exports = {
  PaymentTransaction,
  PlasmaDepositTransaction,
  PaymentTransactionOutput
}
