const Joi = require('@hapi/joi')
const {
  validateAddress,
  validatePayments,
  validateFee,
  validateMetadata,
  validateUtxos,
  validateUtxo,
  validateBn
} = require('./helpers')

const encodeDepositSchema = Joi.object({
  owner: validateAddress.required(),
  amount: [Joi.number().integer().required(), Joi.string().required(), validateBn.required()],
  currency: validateAddress.required()
})

const decodeDepositSchema = Joi.object({
  encodedDeposit: Joi.string().required()
})

const decodeTxBytesSchema = Joi.object({
  tx: Joi.string().required()
})

const createTransactionBodySchema = Joi.object({
  fromAddress: validateAddress.required(),
  fromUtxos: validateUtxos.required(),
  payments: validatePayments.required(),
  fee: validateFee.required(),
  metadata: validateMetadata
})

const decodeUtxoPosSchema = Joi.object({
  utxoPos: [Joi.number().integer().required(), Joi.string().required(), validateBn.required()]
})

const encodeUtxoPosSchema = Joi.object({
  utxo: validateUtxo.required()
})

const decodeMetadataSchema = Joi.object({
  str: validateMetadata.required()
})

const encodeMetadataSchema = Joi.object({
  str: validateMetadata.required()
})

const getTypedDataSchema = Joi.object({
  tx: Joi.object().required(),
  verifyingContract: validateAddress.required()
})

const getToSignHashSchema = Joi.object({
  typedData: Joi.object().required()
})

const getErc20BalanceSchema = Joi.object({
  web3: Joi.any().required(),
  address: validateAddress.required(),
  erc20Address: validateAddress.required()
})

const ethErrorReasonSchema = Joi.object({
  web3: Joi.any().required(),
  hash: Joi.string().required()
})

module.exports = {
  encodeDepositSchema,
  decodeDepositSchema,
  encodeUtxoPosSchema,
  decodeUtxoPosSchema,
  decodeTxBytesSchema,
  createTransactionBodySchema,
  decodeMetadataSchema,
  encodeMetadataSchema,
  getTypedDataSchema,
  getToSignHashSchema,
  getErc20BalanceSchema,
  ethErrorReasonSchema
}
