const Joi = require('@hapi/joi')
const BN = require('bn')
const validateAddress = Joi.string().length(42).hex()
const validateTxOption = Joi.object({
  gas: Joi.number(),
  gasPrice: Joi.number(),
  privateKey: Joi.string().required()
})

const validateBn = Joi.any().custom(value => {
  return value instanceof BN
})
module.exports = {
  validateAddress,
  validateTxOption,
  validateBn
}
