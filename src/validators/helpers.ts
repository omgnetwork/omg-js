import * as Joi from '@hapi/joi';
import web3Utils from 'web3-utils';
import { Buffer } from 'buffer';
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

export const validateTxOptions: Joi.Schema = Joi.object({
  gas: Joi.number().integer(),
  gasPrice: Joi.string(),
  privateKey: Joi.string(),
  from: validateAddress.required()
});

export const validatePayment: Joi.Schema = Joi.object({
  amount: validateAmount.required(),
  currency: validateAddress.required(),
  owner: validateAddress.required()
});

export const validatePayments: Joi.Schema = Joi.array().items(validatePayment);

export const validateMetadata: Joi.Schema = Joi.string().custom((value, helpers) => {
  if (value.startsWith('0x')) {
    const hex = Buffer.from(value.replace('0x', ''), 'hex');
    if (hex.length !== 32) {
      return (helpers as any).message(`"${value}" metadata must be a 32-byte hex string`);
    }
    return value;
  }

  const bytesSize = Buffer.from(value).length;
  if (bytesSize > 32) {
    return (helpers as any).message(`"${value}" is too large. metadata cannot be larger than 32 bytes`);
  }
  return value;
});

export const validateFee: Joi.Schema = Joi.object({
  amount: validateAmount.required(),
  currency: validateAddress.required()
});

export const validateFeeCurrency: Joi.Schema = Joi.object({
  currency: validateAddress.required()
});
