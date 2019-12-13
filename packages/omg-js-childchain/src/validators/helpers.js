const Joi = require('@hapi/joi')
const web3Utils = require('web3-utils')

const validateAddress = Joi.string().custom(value => {
  return web3Utils.isAddress(value)
})

module.exports = {
  validateAddress
}
