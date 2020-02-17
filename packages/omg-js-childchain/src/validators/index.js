const Joi = require('@hapi/joi')
const {
  validateAddress,
  validatePayments,
  validateMetadata,
  validateFee,
  validateAmount,
  validateFeeCurrency
} = require('./helpers')

const childchainConstructorSchema = Joi.object({
  watcherUrl: Joi.string().required(),
  watcherProxyUrl: Joi.string().allow('')
})

const getUtxosSchema = validateAddress.required()

const getBalanceSchema = validateAddress.required()

const getTransactionsSchema = Joi.object({
  address: validateAddress,
  metadata: validateMetadata,
  blknum: validateAmount,
  limit: Joi.number().integer(),
  page: Joi.number().integer()
})

const getTransactionSchema = Joi.object({
  id: Joi.string().required()
})

const getExitDataSchema = Joi.object({
  amount: validateAmount,
  blknum: validateAmount,
  currency: Joi.string(),
  oindex: Joi.number().integer(),
  owner: Joi.string(),
  txindex: Joi.number().integer(),
  utxo_pos: validateAmount,
  spending_txhash: [Joi.string(), Joi.allow(null)],
  creating_txhash: [Joi.string(), Joi.allow(null)]
})

const getChallengeDataSchema = Joi.object({
  utxoPos: validateAmount.required()
})

const submitTransactionSchema = Joi.object({
  transaction: Joi.string().required()
})

const createTransactionSchema = Joi.object({
  owner: validateAddress.required(),
  payments: validatePayments.required(),
  fee: validateFeeCurrency.required(),
  metadata: validateMetadata
})

const signTypedDataSchema = Joi.object({
  txData: Joi.object().required(),
  privateKeys: Joi.array().items(Joi.string()).required()
})

const submitTypedSchema = Joi.object().required()

const signTransactionSchema = Joi.object({
  typedData: Joi.object().required(),
  privateKeys: Joi.array().items(Joi.string()).required()
})

const buildSignedTransactionSchema = Joi.object({
  typedData: Joi.object().required(),
  signatures: Joi.array().items(Joi.string()).required()
})

const sendTransactionSchema = Joi.object({
  fromAddress: validateAddress.required(),
  fromUtxos: Joi.array().items(Joi.object()).required(),
  fromPrivateKeys: Joi.array().items(Joi.string()).required(),
  payments: validatePayments.required(),
  fee: validateFee.required(),
  metadata: validateMetadata,
  verifyingContract: validateAddress.required()
})

const inFlightExitGetOutputChallengeDataSchema = Joi.object({
  txbytes: Joi.string().required(),
  outputIndex: Joi.number().integer().required()
})

const inFlightExitGetInputChallengeDataSchema = Joi.object({
  txbytes: Joi.string().required(),
  inputIndex: Joi.number().integer().required()
})

module.exports = {
  childchainConstructorSchema,
  getUtxosSchema,
  getBalanceSchema,
  getTransactionsSchema,
  getTransactionSchema,
  getExitDataSchema,
  getChallengeDataSchema,
  createTransactionSchema,
  signTypedDataSchema,
  submitTypedSchema,
  signTransactionSchema,
  buildSignedTransactionSchema,
  sendTransactionSchema,
  inFlightExitGetOutputChallengeDataSchema,
  inFlightExitGetInputChallengeDataSchema,
  submitTransactionSchema
}
