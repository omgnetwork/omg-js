const Joi = require('@hapi/joi')
const { validateAddress, validateTxOption, validateBn } = require('./helpers')

const rootchainConstructorSchema = Joi.object({
  web3: Joi.any().required(),
  plasmaContractAddress: validateAddress.required()
})

const getExitTimeSchema = Joi.object({
  exitRequestBlockNumber: Joi.number().integer().required(),
  submissionBlockNumber: Joi.number().integer().required()
})

const getExitQueueSchema = validateAddress

const approveTokenSchema = Joi.object({
  erc20Address: validateAddress.required(),
  txOptions: validateTxOption.required(),
  amount: [Joi.number().integer().required(), Joi.string().required()]
})

const depositSchema = Joi.object({
  amount: [Joi.number().integer().required(), Joi.string().required(), validateBn.required()],
  currency: validateAddress.required(),
  txOptions: validateTxOption.required(),
  callbacks: Joi.object({
    onReceipt: Joi.func(),
    onConfirmation: Joi.func()
  })
})

const startStandardExitSchema = Joi.object({
  utxoPos: [Joi.string().required(), Joi.number().integer().required()],
  outputTx: Joi.string().required(),
  inclusionProof: Joi.string().required(),
  txOptions: validateTxOption.required()
})

const challengeStandardExitSchema = Joi.object({
  standardExitId: [validateBn],
  exitingTx: Joi.string().required(),
  challengeTx: Joi.string().required(),
  inputIndex: Joi.number().integer(),
  challengeTxSig: Joi.string().required(),
  txOptions: validateTxOption.required()
})

const processExitsSchema = Joi.object({
  token: validateAddress,
  exitId: [
    Joi.number()
      .equal(0)
      .required(),
    Joi.string().required()
  ],
  maxExitsToProcess: Joi.number().integer(),
  txOptions: validateTxOption.required()
})

const hasTokenSchema = validateAddress

const addTokenSchema = Joi.object({
  token: validateAddress,
  txOptions: validateTxOption.required()
})

const getStandardExitIdSchema = Joi.object({
  txBytes: Joi.string().required(),
  utxoPos: [Joi.number().integer().required(), validateBn.required()],
  isDeposit: Joi.boolean().required()
})

const getInFlightExitIdSchema = Joi.object({
  txBytes: Joi.string().required()
})

const startInFlightExitSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  inputTxs: Joi.array().required(),
  inputUtxosPos: Joi.array()
    .items(Joi.alternatives(Joi.number().integer(), validateBn))
    .required(),
  inputTxsInclusionProofs: Joi.array()
    .items(Joi.string())
    .required(),
  inFlightTxSigs: Joi.array()
    .items(Joi.string())
    .required(),
  txOptions: validateTxOption
})

const piggybackInFlightExitOnOutputSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  outputIndex: Joi.number().integer().required(),
  txOptions: validateTxOption
})

const piggybackInFlightExitOnInputSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  inputIndex: Joi.number().integer(),
  txOptions: validateTxOption
})

const challengeInFlightExitNotCanonicalSchema = Joi.object({
  inputTx: Joi.string().required(),
  inputUtxoPos: [Joi.number().integer().required(), validateBn.required()],
  inFlightTx: Joi.string().required(),
  inFlightTxInputIndex: Joi.number().integer().required(),
  competingTx: Joi.string().required(),
  competingTxInputIndex: Joi.number().integer().required(),
  competingTxPos: [Joi.number().integer().required(), validateBn.required(), Joi.string().equal('0x')],
  competingTxInclusionProof: Joi.string(),
  competingTxWitness: Joi.string(),
  txOptions: validateTxOption
})

const respondToNonCanonicalChallengeSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxPos: [Joi.number().integer().required(), validateBn.required()],
  inFlightTxInclusionProof: Joi.string().required(),
  txOptions: validateTxOption
})

const challengeInFlightExitInputSpentSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxInputIndex: [Joi.number().integer().required(), validateBn.required()],
  challengingTx: Joi.string().required(),
  challengingTxInputIndex: [Joi.number().integer().required(), validateBn.required()],
  challengingTxWitness: Joi.string().required(),
  inputTx: Joi.string().required(),
  inputUtxoPos: [Joi.number().integer().required(), validateBn.required()],
  txOptions: validateTxOption
})

const challengeInFlightExitOutputSpentSchema = Joi.object({
  inFlightTx: Joi.string().required(),
  inFlightTxInclusionProof: Joi.string().required(),
  inFlightTxOutputPos: [Joi.number().integer().required(), validateBn.required()],
  challengingTx: Joi.string().required(),
  challengingTxInputIndex: Joi.number().integer().required(),
  challengingTxWitness: Joi.string().required(),
  txOptions: validateTxOption
})

module.exports = {
  rootchainConstructorSchema,
  getExitTimeSchema,
  getExitQueueSchema,
  approveTokenSchema,
  depositSchema,
  startStandardExitSchema,
  challengeStandardExitSchema,
  processExitsSchema,
  hasTokenSchema,
  addTokenSchema,
  getStandardExitIdSchema,
  getInFlightExitIdSchema,
  startInFlightExitSchema,
  piggybackInFlightExitOnOutputSchema,
  piggybackInFlightExitOnInputSchema,
  challengeInFlightExitNotCanonicalSchema,
  respondToNonCanonicalChallengeSchema,
  challengeInFlightExitInputSpentSchema,
  challengeInFlightExitOutputSpentSchema
}
