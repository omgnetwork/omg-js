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
  outputId: Joi.string().required(),
  outputTx: Joi.string().required(),
  inclusionProof: Joi.string().required(),
  txOptions: validateTxOption.required()
})

module.exports = {
  approveTokenSchema,
  depositTokenSchema,
  depositEthSchema,
  startStandardExitSchema
}
