const Joi = require('@hapi/joi')
const BN = require('bn.js')
const web3Utils = require('web3-utils')

const validateAddress = Joi.string().custom(value => {
  return web3Utils.isAddress(value)
})

const validateBn = Joi.any().custom((value, helpers) => {
  if (!BN.isBN(value)) {
    return helpers.message(`${value} is not an instance of BN.js`)
  }
  return value
})

const validatePayment = Joi.object({
  amount: [Joi.number().required(), Joi.string().required(), validateBn.required()],
  currency: validateAddress.required(),
  owner: validateAddress.required()
})

const validatePayments = Joi.array().items(validatePayment)

const validateMetadata = Joi.any().custom((value, helpers) => {
  const bytesSize = Buffer.from(value).length
  if (bytesSize > 32) {
    return helpers.message(`"${value}" is too large. metadata cannot be larger than 32 bytes`)
  }
  return value
})

const validateFee = Joi.object({
  amount: [Joi.number().required(), Joi.string().required(), validateBn.required()],
  currency: validateAddress.required()
})

module.exports = {
  validateAddress,
  validatePayments,
  validatePayment,
  validateMetadata,
  validateFee,
  validateBn
}
