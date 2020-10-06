import * as Joi from '@hapi/joi';
import web3Utils from 'web3-utils';
import BN from 'bn.js';

export const validateAddress: Joi.Schema = Joi.string().custom(value => {
  return web3Utils.isAddress(value);
});

export const validateBn: Joi.Schema = Joi.any().custom((value, helpers) => {
  if (!BN.isBN(value)) {
    return (helpers as any).message(`${value} is not an instance of BN.js`);
  }
  return value;
})

export const validateAmount: Joi.Schema = Joi.alternatives().try(
  Joi.number().integer().required(),
  validateBn.required(),
  Joi.string().regex(/^\d+$/).required()
);

export const validateTransactionOptions: Joi.Schema = Joi.object({
  gas: Joi.number().integer(),
  gasPrice: Joi.string(),
  privateKey: Joi.string(),
  from: validateAddress.required()
});
