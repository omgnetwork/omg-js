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

module.exports = {
  validateAddress,
  validateBn
}
