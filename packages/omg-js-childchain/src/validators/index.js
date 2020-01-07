const Joi = require('@hapi/joi')
const { validateAddress, validatePayments, validateFee, validateBn } = require('./helpers')

const childchainConstructorSchema = Joi.object({
  watcherUrl: Joi.string().required(),
  watcherProxyUrl: Joi.string().allow('')
})

const getUtxosSchema = validateAddress.required()

const getBalanceSchema = validateAddress.required()

const getTransactionsSchema = Joi.object({
  address: validateAddress,
  metadata: Joi.string().allow(null),
  blknum: Joi.number(),
  limit: Joi.number(),
  page: Joi.number()
})

const getExitDataSchema = Joi.object({
  amount: [Joi.string(), Joi.number(), validateBn],
  blknum: Joi.number(),
  currency: Joi.string(),
  oindex: Joi.number(),
  owner: Joi.string(),
  txindex: Joi.number(),
  utxo_pos: Joi.number(),
  spending_txhash: [Joi.string(), Joi.allow(null)],
  creating_txhash: [Joi.string(), Joi.allow(null)]
})

const createTransactionSchema = Joi.object({
  owner: validateAddress.required(),
  payments: validatePayments.required(),
  fee: validateFee.required(),
  metadata: Joi.string().allow(null)
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
  metadata: Joi.string().allow(null),
  verifyingContract: validateAddress.required()
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
