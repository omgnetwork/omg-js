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
  txOptions: helpers.validateTxOptions.required()
});

export const depositSchema: Joi.Schema = Joi.object({
  amount: helpers.validateAmount.required(),
  currency: helpers.validateAddress,
  txOptions: helpers.validateTxOptions.required()
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
  txOptions: helpers.validateTxOptions.required()
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
  txOptions: helpers.validateTxOptions.required()
});

export const processExitsSchema: Joi.Schema = Joi.object({
  token: helpers.validateAddress.required(),
  exitId: [
    Joi.number().equal(0).required(),
    Joi.string().required()
  ],
  maxExitsToProcess: Joi.number().integer(),
  txOptions: helpers.validateTxOptions.required()
});

export const hasExitQueueSchema: Joi.Schema = helpers.validateAddress.required();

export const addExitQueueSchema: Joi.Schema = Joi.object({
  token: helpers.validateAddress.required(),
  txOptions: helpers.validateTxOptions.required()
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
  txOptions: helpers.validateTxOptions.required()
});

export const piggybackInFlightExitOnOutputSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  outputIndex: Joi.number().integer().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const piggybackInFlightExitOnInputSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inputIndex: Joi.number().integer().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const challengeInFlightExitNotCanonicalSchema: Joi.Schema = Joi.object({
  inputTx: Joi.string().required(),
  inputUtxoPos: helpers.validateAmount.required(),
  inFlightTx: Joi.string().required(),
  inFlightTxInputIndex: Joi.number().integer().required(),
  competingTx: Joi.string().required(),
  competingTxInputIndex: Joi.number().integer().required(),
  competingTxPos: [Joi.number().integer().required(), helpers.validateBn.required(), Joi.string().equal('0x')],
  competingTxInclusionProof: Joi.string(),
  competingTxWitness: Joi.string(),
  txOptions: helpers.validateTxOptions.required()
});

export const respondToNonCanonicalChallengeSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxPos: helpers.validateAmount.required(),
  inFlightTxInclusionProof: Joi.string().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const challengeInFlightExitInputSpentSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxInputIndex: Joi.number().integer().required(),
  challengingTx: Joi.string().required(),
  challengingTxInputIndex: Joi.number().integer().required(),
  challengingTxWitness: Joi.string().required(),
  inputTx: Joi.string().required(),
  inputUtxoPos: helpers.validateAmount.required(),
  txOptions: helpers.validateTxOptions.required()
});

export const challengeInFlightExitOutputSpentSchema: Joi.Schema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxInclusionProof: Joi.string().required(),
  inFlightTxOutputPos: helpers.validateAmount.required(),
  challengingTx: Joi.string().required(),
  challengingTxInputIndex: Joi.number().integer().required(),
  challengingTxWitness: Joi.string().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const deleteNonPiggybackedInFlightExitSchema: Joi.Schema = Joi.object({
  exitId: Joi.string().required(),
  txOptions: helpers.validateTxOptions.required()
});
