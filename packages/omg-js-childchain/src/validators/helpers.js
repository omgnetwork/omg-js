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

const validateAmount = Joi.alternatives().try(
  Joi.number().integer().required(),
  validateBn.required(),
  Joi.string().regex(/^\d+$/).required()
)

const validatePayment = Joi.object({
  amount: validateAmount.required(),
  currency: validateAddress.required(),
  owner: validateAddress.required()
})

const validatePayments = Joi.array().items(validatePayment)

const validateMetadata = Joi.string().custom((value, helpers) => {
  if (value.startsWith('0x')) {
    const hex = Buffer.from(value.replace('0x', ''), 'hex')
    if (hex.length !== 32) {
      return helpers.message(`"${value}" metadata must be a 32-byte hex string`)
    }
    return value
  }

  const bytesSize = Buffer.from(value).length
  if (bytesSize > 32) {
    return helpers.message(`"${value}" is too large. metadata cannot be larger than 32 bytes`)
  }
  return value
})

const validateFee = Joi.object({
  amount: validateAmount.required(),
  currency: validateAddress.required()
})

const validateFeeCreateFromChildchain = Joi.object({
  currency: validateAddress.required()
})

module.exports = {
  validateAmount,
  validateAddress,
  validatePayments,
  validatePayment,
  validateMetadata,
  validateFee,
  validateBn,
  validateFeeCreateFromChildchain
}
