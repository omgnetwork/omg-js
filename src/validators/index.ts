import * as Joi from '@hapi/joi';

import * as helpers from '@lib/validators/helpers';

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

export const approveTokenSchema: Joi.Schema = Joi.object({
  erc20Address: helpers.validateAddress.required(),
  amount: helpers.validateAmount.required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const depositSchema: Joi.Schema = Joi.object({
  amount: helpers.validateAmount.required(),
  currency: helpers.validateAddress,
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const encodeDepositSchema: Joi.Schema = Joi.object({
  owner: helpers.validateAddress.required(),
  amount: helpers.validateAmount.required(),
  currency: helpers.validateAddress.required()
});

export const getStandardExitIdSchema: Joi.Schema = Joi.object({
  txBytes: Joi.string().required(),
  utxoPos: helpers.validateAmount.required(),
  isDeposit: Joi.boolean().required()
});

export const getInFlightExitIdSchema: Joi.Schema = Joi.object({
  txBytes: Joi.string().required()
});

export const getInFlightExitDataSchema: Joi.Schema = Joi.object({
  exitIds: Joi.array().items(Joi.string().required())
});

export const startStandardExitSchema: Joi.Schema = Joi.object({
  utxoPos: helpers.validateAmount.required(),
  outputTx: Joi.string().required(),
  inclusionProof: Joi.string().required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const getExitDataSchema: Joi.Schema = Joi.object({
  transactionHash: Joi.string().required()
});

export const challengeStandardExitSchema: Joi.Schema = Joi.object({
  standardExitId: helpers.validateAmount.required(),
  exitingTx: Joi.string().required(),
  challengeTx: Joi.string().required(),
  inputIndex: Joi.number().integer(),
  challengeTxSig: Joi.string().required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const processExitsSchema: Joi.Schema = Joi.object({
  token: helpers.validateAddress.required(),
  exitId: [
    Joi.number().equal(0).required(),
    Joi.string().required()
  ],
  maxExitsToProcess: Joi.number().integer(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const hasExitQueueSchema: Joi.Schema = helpers.validateAddress.required();

export const addExitQueueSchema: Joi.Schema = Joi.object({
  token: helpers.validateAddress.required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const startInFlightExitSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inputTxs: Joi.array().required(),
  inputUtxosPos: Joi.array().items(helpers.validateAmount.required()),
  inputTxsInclusionProofs: Joi.array()
    .items(Joi.string())
    .required(),
  inFlightTxSigs: Joi.array()
    .items(Joi.string())
    .required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const piggybackInFlightExitOnOutputSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  outputIndex: Joi.number().integer().required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});

export const piggybackInFlightExitOnInputSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inputIndex: Joi.number().integer().required(),
  transactionOptions: helpers.validateTransactionOptions.required()
});
