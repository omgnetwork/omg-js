const Joi = require('@hapi/joi')
const { validateAddress, validateTxOption, validateBn } = require('./helpers')

const childchainConstructorSchema = Joi.object({
  watcherUrl: Joi.string().required(),
  watcherProxyUrl: Joi.string()
})

const getUtxosSchema = validateAddress.required()

module.exports = {
  childchainConstructorSchema,
  getUtxosSchema
}
