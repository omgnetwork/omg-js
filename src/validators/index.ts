import * as Joi from '@hapi/joi';

import * as helpers from 'validators/helpers';

export const constructorSchema: Joi.Schema = Joi.object({
  plasmaContractAddress: helpers.validateAddress.required(),
  watcherUrl: Joi.string().required(),
  web3Provider: Joi.any().required()
});

export const getExitTimeSchema: Joi.Schema = Joi.object({
  exitRequestBlockNumber: helpers.validateAmount.required(),
  submissionBlockNumber: helpers.validateAmount.required()
});

export const getExitQueueSchema: Joi.Schema = helpers.validateAddress.required();
