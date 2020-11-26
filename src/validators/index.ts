/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import * as Joi from '@hapi/joi';

import * as helpers from '@lib/validators/helpers';
import * as Errors from '@lib/errors';

/** @internal Sanitize joi validation error */
export function validate (
  args: unknown, schema: Joi.Schema
): void {
  try {
    Joi.assert(args, schema);
  } catch (error) {
    throw new Errors.ValidationError({
      message: error.details[0].message,
      stack: error.stack
    });
  }
}

export const constructorSchema: Joi.Schema = Joi.object({
  plasmaContractAddress: helpers.validateAddress.required(),
  watcherUrl: Joi.string().required(),
  web3Provider: Joi.any().required(),
  watcherSecurityUrl: Joi.string(),
  watcherProxyUrl: Joi.string(),
});

export const getExitTimeSchema: Joi.Schema = Joi.object({
  exitRequestBlockNumber: helpers.validateAmount.required(),
  submissionBlockNumber: helpers.validateAmount.required()
});

export const getExitQueueSchema: Joi.Schema = helpers.validateAddress.required();

export const approveERC20DepositSchema: Joi.Schema = Joi.object({
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

export const getInFlightExitIdSchema: Joi.Schema = Joi.string().required();

export const getInFlightExitDataSchema: Joi.Schema = Joi.array().items(Joi.string().required());

export const startStandardExitSchema: Joi.Schema = Joi.object({
  utxoPos: helpers.validateAmount.required(),
  outputTx: Joi.string().required(),
  inclusionProof: Joi.string().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const getExitDataSchema: Joi.Schema = Joi.object().required();

export const getDepositExitDataSchema: Joi.Schema = Joi.string().required();

export const challengeStandardExitSchema: Joi.Schema = Joi.object({
  standardExitId: helpers.validateAmount.required(),
  exitingTx: Joi.string().required(),
  challengeTx: Joi.string().required(),
  inputIndex: Joi.number().integer(),
  challengeTxSig: Joi.string().required(),
  txOptions: helpers.validateTxOptions.required()
});

export const processExitsSchema: Joi.Schema = Joi.object({
  currency: helpers.validateAddress.required(),
  exitId: [
    Joi.number().equal(0).required(),
    Joi.string().required()
  ],
  maxExitsToProcess: Joi.number().integer(),
  txOptions: helpers.validateTxOptions.required()
});

export const hasExitQueueSchema: Joi.Schema = helpers.validateAddress.required();

export const addExitQueueSchema: Joi.Schema = Joi.object({
  currency: helpers.validateAddress.required(),
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

export const getUtxosSchema: Joi.Schema = helpers.validateAddress.required();

export const getBalanceSchema: Joi.Schema = helpers.validateAddress.required();

export const getTransactionsSchema: Joi.Schema = Joi.object({
  address: helpers.validateAddress,
  metadata: helpers.validateMetadata,
  blknum: helpers.validateAmount,
  limit: Joi.number().integer(),
  page: Joi.number().integer()
}).unknown();

export const getTransactionSchema: Joi.Schema = Joi.object({
  id: Joi.string().required()
});

export const getDepositsSchema: Joi.Schema = Joi.object({
  address: helpers.validateAddress,
  limit: Joi.number().integer(),
  page: Joi.number().integer()
});

export const getUtxoExitDataSchema: Joi.Schema = Joi.object({
  blknum: helpers.validateAmount,
  txindex: Joi.number().integer(),
  oindex: Joi.number().integer()
}).unknown();

export const getChallengeDataSchema: Joi.Schema = Joi.object({
  utxoPos: helpers.validateAmount.required()
});

export const createTransactionSchema: Joi.Schema = Joi.object({
  owner: helpers.validateAddress.required(),
  payments: helpers.validatePayments.required(),
  feeCurrency: helpers.validateAddress.required(),
  metadata: helpers.validateMetadata
});

export const signTypedDataSchema: Joi.Schema = Joi.object({
  txData: Joi.object().required(),
  privateKeys: Joi.array().items(Joi.string()).required()
});

export const submitTypedDataSchema: Joi.Schema = Joi.object().required();

export const signTransactionSchema: Joi.Schema = Joi.object({
  typedData: Joi.object().required(),
  privateKeys: Joi.array().items(Joi.string()).required()
});

export const buildSignedTransactionSchema: Joi.Schema = Joi.object({
  typedData: Joi.object().required(),
  signatures: Joi.array().items(Joi.string()).required()
});

export const sendTransactionSchema: Joi.Schema = Joi.object({
  fromAddress: helpers.validateAddress.required(),
  fromUtxos: Joi.array().items(Joi.object()).required(),
  fromPrivateKeys: Joi.array().items(Joi.string()).required(),
  payments: helpers.validatePayments.required(),
  fee: helpers.validateFee.required(),
  metadata: helpers.validateMetadata
});

export const inFlightExitGetOutputChallengeDataSchema: Joi.Schema = Joi.object({
  txbytes: Joi.string().required(),
  outputIndex: Joi.number().integer().required()
});

export const inFlightExitGetInputChallengeDataSchema: Joi.Schema = Joi.object({
  txbytes: Joi.string().required(),
  inputIndex: Joi.number().integer().required()
});

export const mergeUtxosSchema: Joi.Schema = Joi.object({
  utxos: Joi.array().max(4).min(2).items(Joi.object()).required(),
  privateKey: Joi.string().required(),
  metadata: helpers.validateMetadata
});

export const getErc20BalanceSchema: Joi.Schema = Joi.object({
  address: helpers.validateAddress.required(),
  erc20Address: helpers.validateAddress.required()
});

export const getRootchainETHBalanceSchema: Joi.Schema = helpers.validateAddress.required();

export const waitForRootchainTransactionSchema: Joi.Schema = Joi.object({
  transactionHash: Joi.string().required(),
  checkIntervalMs: Joi.number().integer().required(),
  blocksToWait: Joi.number().integer().required(),
  onCountdown: Joi.func()
});

export const waitForChildchainBalanceSchema: Joi.Schema = Joi.object({
  address: helpers.validateAddress.required(),
  expectedAmount: helpers.validateAmount.required(),
  currency: helpers.validateAddress.required()
});

export const waitForUtxoSchema: Joi.Schema = Joi.object({
  address: helpers.validateAddress.required(),
  oindex: Joi.number().integer().required(),
  txindex: Joi.number().integer().required(),
  blknum: Joi.number().integer().required()
});

export const encodeTransactionSchema: Joi.Schema = Joi.object({
  txType: Joi.number().required(),
  inputs: Joi.array().items(Joi.object()).required(),
  outputs: Joi.array().items(Joi.object()).required(),
  txData: Joi.number().required(),
  metadata: helpers.validateMetadata,
  signatures: Joi.array().items(Joi.string()),
  sigs: Joi.array().items(Joi.string()),
  signed: Joi.boolean()
});

export const encodeUtxoPosSchema: Joi.Schema = Joi.object({
  utxo: Joi.object({
    blknum: helpers.validateAmount,
    txindex: Joi.number().integer(),
    oindex: Joi.number().integer()
  }).unknown()
});

export const decodeUtxoPosSchema: Joi.Schema = Joi.object({
  utxoPos: helpers.validateAmount.required()
});

export const decodeMetadataSchema: Joi.Schema = Joi.object({
  metadata: helpers.validateMetadata.required()
});

export const encodeMetadataSchema: Joi.Schema = Joi.object({
  metadata: helpers.validateMetadata.required()
});

export const hashTypedDataSchema: Joi.Schema = Joi.object({
  typedData: Joi.object().required()
});

export const getTypedDataSchema: Joi.Schema = Joi.object({
  transactionBody: Joi.object().required()
});

export const createTransactionBodySchema: Joi.Schema = Joi.object({
  fromAddress: helpers.validateAddress.required(),
  fromUtxos: helpers.validateUtxos.required(),
  payments: helpers.validatePayments.required(),
  fee: helpers.validateFee.required(),
  metadata: helpers.validateMetadata
});
