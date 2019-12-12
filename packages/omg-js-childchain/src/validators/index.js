const Joi = require('@hapi/joi')
const { validateAddress, validateTxOption, validateBn } = require('./helpers')

const childchainConstructorSchema = Joi.object({
  watcherUrl: Joi.string().required(),
  watcherProxyUrl: Joi.string()
})

const getUtxosSchema = validateAddress.required()
const getBalanceSchema = validateAddress.required()
const getTransactionSchema = Joi.string().required()
const getTransactionsSchema = Joi.object({
  address: validateAddress,
  metadata: Joi.string(),
  blknum: Joi.number(),
  limit: Joi.number(),
  page: Joi.number()
})
const getExitDataSchema = Joi.object({
  amount: Joi.number(),
  blknum: Joi.number(),
  currency: Joi.string(),
  oindex: Joi.number(),
  owner: Joi.string(),
  txindex: Joi.number(),
  utxo_pos: Joi.number()
})
const getChallengeDataSchema = Joi.string().required()
const createTransactionSchema = Joi.object({
  owner: validateAddress.required(),
  payments: Joi.object().required(), // TODO
  fee: Joi.object().required(), // TODO
  metadata: Joi.string()
})
const signTypedDataSchema = Joi.object({
  txData: Joi.object().required(), // TODO
  privateKeys: Joi.array().items(Joi.string()).required()
})
const submitTypedSchema = Joi.object().required() // TODO
const signTransactionSchema = Joi.object({
  typedData: Joi.string(),
  privateKeys: Joi.array().items(Joi.string()).required()
})
const buildSignedTransactionSchema = Joi.object({
  txData: Joi.string().required(),
  signatures: Joi.array().items(Joi.string()).required()
})
const submitTransactionSchema = Joi.string().required()

// TODO REVIEW BELOW
const sendTransactionSchema = Joi.object({
  fromAddress: Joi.string().required(),
  fromUtxos: Joi.string().required(),
  fromPrivateKeys: Joi.string().required(),
  toAddress: Joi.string().required(),
  toAmount: Joi.string().required(),
  currency: Joi.string().required(),
  metadata: Joi.string().required(),
  verifyingContract: Joi.string().required(),
  feeAmount: Joi.string().required(),
  feeCurrency: Joi.number().required()
})

module.exports = {
  childchainConstructorSchema,
  getUtxosSchema,
  getBalanceSchema,
  getTransactionSchema,
  getTransactionsSchema,
  getExitDataSchema,
  getChallengeDataSchema,
  createTransactionSchema,
  signTypedDataSchema,
  submitTypedSchema,
  signTransactionSchema,
  buildSignedTransactionSchema,
  submitTransactionSchema,
  sendTransactionSchema
}
