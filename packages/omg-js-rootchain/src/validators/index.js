const Joi = require('@hapi/joi')
const { validateAddress, validateTxOption, validateBn } = require('./helpers')

const approveTokenSchema = Joi.object({
  erc20Address: validateAddress.required(),
  txOptions: validateTxOption.required(),
  amount: [Joi.number(), validateBn]
})

const depositEthSchema = Joi.object({
  depositTx: Joi.string().required(),
  amount: [Joi.number(), validateBn],
  txOptions: validateTxOption.required(),
  callbacks: Joi.object({
    onReceipt: Joi.func(),
    onConfirmation: Joi.func()
  })
})

const depositTokenSchema = Joi.object({
  depositTx: Joi.string().required(),
  txOptions: validateTxOption.required()
})

const startStandardExitSchema = Joi.object({
  outputId: [Joi.string().required(), Joi.number().required()],
  outputTx: Joi.string().required(),
  inclusionProof: Joi.string().required(),
  txOptions: validateTxOption.required()
})

const challengeStandardExitSchema = Joi.object({
  standardExitId: [validateBn],
  exitingTx: Joi.string().required(),
  challengeTx: Joi.string().required(),
  inputIndex: Joi.number(),
  challengeTxSig: Joi.string().required(),
  txOptions: validateTxOption.required()
})

const processExitsSchema = Joi.object({
  token: validateAddress,
  exitId: [Joi.number().equal(0).required(), Joi.string().required()],
  maxExitsToProcess: Joi.number(),
  txOptions: validateTxOption.required()
})

const hasTokenSchema = validateAddress

const addTokenSchema = Joi.object({
  token: validateAddress,
  txOptions: validateTxOption.required()
})

module.exports = {
  approveTokenSchema,
  depositTokenSchema,
  depositEthSchema,
  startStandardExitSchema,
  challengeStandardExitSchema,
  processExitsSchema,
  hasTokenSchema,
  addTokenSchema
}
