const Joi = require('@hapi/joi')
const {
  validateAddress,
  validatePayments,
  validateMetadata,
  validateFee,
  validateBn
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
  blknum: Joi.number().integer(),
  limit: Joi.number().integer(),
  page: Joi.number().integer()
})

const getExitDataSchema = Joi.object({
  amount: [Joi.string(), Joi.number().integer(), validateBn],
  blknum: Joi.number().integer(),
  currency: Joi.string(),
  oindex: Joi.number().integer(),
  owner: Joi.string(),
  txindex: Joi.number().integer(),
  utxo_pos: Joi.number().integer(),
  spending_txhash: [Joi.string(), Joi.allow(null)],
  creating_txhash: [Joi.string(), Joi.allow(null)]
})

const createTransactionSchema = Joi.object({
  owner: validateAddress.required(),
  payments: validatePayments.required(),
  fee: validateFee.required(),
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
