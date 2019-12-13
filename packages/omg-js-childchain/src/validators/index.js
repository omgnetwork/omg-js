const Joi = require('@hapi/joi')
const { validateAddress } = require('./helpers')

const childchainConstructorSchema = Joi.object({
  watcherUrl: Joi.string().required(),
  watcherProxyUrl: Joi.string()
})

const getUtxosSchema = validateAddress.required()
const getBalanceSchema = validateAddress.required()
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
const sendTransactionSchema = Joi.object({
  fromAddress: validateAddress.required(),
  fromUtxos: Joi.string().required(),
  fromPrivateKeys: Joi.string().required(),
  toAddress: validateAddress.required(),
  toAmount: Joi.number().required(),
  currency: Joi.string().required(),
  metadata: Joi.string().required(),
  verifyingContract: validateAddress.required(),
  feeAmount: Joi.number().required(),
  feeCurrency: Joi.string().required()
})
const inFlightExitGetOutputChallengeDataSchema = Joi.object({
  txbytes: Joi.string().required(),
  outputIndex: Joi.number().required()
})
const inFlightExitGetInputChallengeDataSchema = Joi.object({
  txbytes: Joi.string().required(),
  inputIndex: Joi.number().required()
})

module.exports = {
  childchainConstructorSchema,
  getUtxosSchema,
  getBalanceSchema,
  getTransactionsSchema,
  getExitDataSchema,
  createTransactionSchema,
  signTypedDataSchema,
  submitTypedSchema,
  signTransactionSchema,
  buildSignedTransactionSchema,
  sendTransactionSchema,
  inFlightExitGetOutputChallengeDataSchema,
  inFlightExitGetInputChallengeDataSchema
}
