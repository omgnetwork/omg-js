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

import BN from 'bn.js';
import { Contract } from 'web3-eth-contract';
import { HttpProvider } from 'web3-providers-http';

export type IComplexAmount = string | number | BN;

export interface IOmgJS {
  plasmaContractAddress: string;
  watcherUrl: string;
  watcherSecurityUrl?: string;
  watcherProxyUrl?: string;
  web3Provider: Partial<HttpProvider>;
}

export interface ITransactionOptions {
  from: string;
  gasLimit?: number;
  gasPrice?: string;
  privateKey?: string;
}

export interface ITransactionDetails extends ITransactionOptions {
  to?: string;
  data?: string;
  value?: string;
}

export interface ITransactionReceipt {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: number;
  from: string;
  gasUsed: number;
  logs: Array<Record<string, unknown>>;
  root: string;
  to: string;
  transactionHash: string;
  transactionIndex: number;
}

export interface IWatcherTransactionReceipt {
  blknum: number;
  txhash: string;
  txindex: number
}

export interface IUTXO {
  amount: number;
  blknum: number;
  creating_txhash: string;
  currency: string;
  oindex: number;
  otype: number;
  owner: string;
  spending_txhash: string;
  txindex: number;
  utxo_pos: number;
}

export interface IOutput {
  outputType?: number;
  outputGuard?: string;
  owner?: string;
  currency: string;
  amount: IComplexAmount;
}

export interface ITransactionData {
  txindex: number;
  txhash: string;
  metadata: string;
  txbytes: string;
  block: Record<string, unknown>;
  inputs: IUTXO[];
  outputs: IOutput[];
}

export interface ITransactionBody {
  txType?: number;
  sigs?: Array<string>;
  inputs: IUTXO[];
  outputs: IOutput[];
  txData?: number;
  metadata?: string;
}

export interface IExitData {
  proof: string;
  txbytes: string;
  utxo_pos: number;
}

export interface IInFlightExitData {
  in_flight_tx: string;
  in_flight_tx_sigs: Array<string>;
  input_txs: Array<string>;
  input_txs_inclusion_proofs: Array<string>;
  input_utxos_pos: Array<IComplexAmount>;
}

export interface IPayment {
  owner: string;
  currency: string;
  amount: IComplexAmount;
}

export interface IFeeDetail {
  currency: string;
  amount: IComplexAmount;
}

export interface IPagination {
  limit?: number;
  page?: number;
}

export interface IVault {
  contract: Contract;
  address: string;
}

export interface IPaymentExitGame extends IVault {
  bonds: {
    standardExit: number;
    piggyback: number;
    inflightExit: number;
  }
}

export interface IRpcError {
  code: number;
  description: string;
  messages: Record<string, unknown>;
}

export interface IError {
  name?: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stack: any;
}

export interface IApproveDeposit {
  erc20Address: string;
  amount: IComplexAmount;
  txOptions: ITransactionOptions
}

export interface IDeposit {
  amount: IComplexAmount;
  currency?: string;
  txOptions: ITransactionOptions;
}

export interface IGetExitTime {
  exitRequestBlockNumber: IComplexAmount,
  submissionBlockNumber: IComplexAmount,
  retries?: number
}

export interface IExitTime {
  scheduledFinalizationTime: number,
  msUntilFinalization: number
}

export interface IExitQueue {
  priority: string,
  exitableAt: string,
  exitId: string
}

export interface IProcessExits {
  currency: string;
  exitId: number | string;
  maxExitsToProcess: number;
  txOptions: ITransactionOptions
}

export interface IAddExitQueue {
  currency: string;
  txOptions: ITransactionOptions;
}

export interface IInFlightExitInputOutput {
  outputId: string;
  exitTarget: string;
  token: string;
  amount: string;
  piggybackBondSize: string;
}

export interface IInFlightExitContractData {
  isCanonical: boolean;
  exitStartTimestamp: string;
  exitMap: string;
  position: string;
  inputs: Array<IInFlightExitInputOutput>;
  outputs: Array<IInFlightExitInputOutput>;
  bondOwner: string;
  bondSize: string;
  oldestCompetitorPosition: string;
}

export interface IStartInFlightExit {
  inFlightTx: string;
  inputTxs: Array<string>;
  inputUtxosPos: Array<IComplexAmount>;
  inputTxsInclusionProofs: Array<string>;
  inFlightTxSigs: Array<string>;
  txOptions: ITransactionOptions
}

export interface IPiggybackInFlightExitOnOutput {
  inFlightTx: string;
  outputIndex: number;
  txOptions: ITransactionOptions;
}

export interface IPiggybackInFlightExitOnInput {
  inFlightTx: string;
  inputIndex: number;
  txOptions: ITransactionOptions;
}


export interface IChallengeInFlightExitNotCanonical {
  inputTx: string;
  inputUtxoPos: IComplexAmount;
  inFlightTx: string;
  inFlightTxInputIndex: number;
  competingTx: string;
  competingTxInputIndex: number;
  competingTxPos: IComplexAmount;
  competingTxInclusionProof: string;
  competingTxWitness: string;
  txOptions: ITransactionOptions;
}

export interface IRespondToNonCanonicalChallenge {
  inFlightTx: string;
  inFlightTxPos: IComplexAmount;
  inFlightTxInclusionProof: string;
  txOptions: ITransactionOptions;
}

export interface IChallengeInFlightExitInputSpent {
  inFlightTx: string;
  inFlightTxInputIndex: number;
  challengingTx: string;
  challengingTxInputIndex: number;
  challengingTxWitness: string;
  inputTx: string;
  inputUtxoPos: IComplexAmount;
  txOptions: ITransactionOptions;
}

export interface IChallengeInFlightExitOutputSpent {
  inFlightTx: string;
  inFlightTxInclusionProof: string;
  inFlightTxOutputPos: IComplexAmount;
  challengingTx: string;
  challengingTxInputIndex: number;
  challengingTxWitness: string;
  txOptions: ITransactionOptions;
}

export interface IDeleteNonPiggybackedInFlightExit {
  exitId: string;
  txOptions: ITransactionOptions;
}

export interface IGetStandardExitId {
  txBytes: string;
  utxoPos: IComplexAmount;
  isDeposit: boolean;
}

export interface IStartStandardExit {
  utxoPos: IComplexAmount;
  outputTx: string;
  inclusionProof: string;
  txOptions: ITransactionOptions
}

export interface IChallengeStandardExit {
  standardExitId: IComplexAmount;
  exitingTx: string;
  challengeTx: string;
  inputIndex: number;
  challengeTxSig: string;
  txOptions: ITransactionOptions
}

export interface IGetRootchainERC20Balance {
  address: string;
  erc20Address: string;
}

export interface IWaitForRootchainTransaction {
  transactionHash: string;
  checkIntervalMs: number;
  blocksToWait: number;
  onCountdown: (blocksRemaining: number) => void;
}

export interface IWaitForChildchainBalance {
  address: string;
  expectedAmount: IComplexAmount;
  currency: string;
}

export interface IWaitForUtxo {
  address: string;
  oindex: number;
  txindex: number;
  blknum: number;
}

export interface IDepositTransaction {
  owner: string;
  amount: IComplexAmount;
  currency: string;
}

export interface IEncodeTransaction extends ITransactionBody {
  signatures?: Array<string>;
  signed?: boolean;
}

export interface IEncodeUtxoPos {
  blknum: number;
  txindex: number;
  oindex: number;
}

export interface ISignTypedData {
  txData: ICreatedTransaction;
  privateKeys: Array<string>;
}

export interface ISignTransaction {
  typedData: ITypedData;
  privateKeys: Array<string>;
}

export interface IBuildSignedTransaction {
  typedData: ITypedData;
  signatures: Array<string>;
}

export interface ICreateTransactionBody {
  fromAddress: string;
  fromUtxos: Array<Partial<IUTXO>>;
  payments: Array<IPayment>;
  fee: IFeeDetail;
  metadata?: string;
}

export interface IMergeUtxos {
  utxos: Array<IUTXO>;
  privateKey: string;
  metadata?: string;
}

export interface ITypedDataSpec {
  name: string;
  type: string;
}

export interface ITypedDataTypes {
  EIP712Domain: Array<ITypedDataSpec>;
  Transaction: Array<ITypedDataSpec>;
  Input: Array<ITypedDataSpec>;
  Output: Array<ITypedDataSpec>;
}

export interface ITypedDataDomainData {
  name: string;
  version: string;
  verifyingContract: string;
  salt: string;
}

export interface ITypedDataMessage {
  txType: number
  input0: Partial<IUTXO>;
  input1: Partial<IUTXO>;
  input2: Partial<IUTXO>;
  input3: Partial<IUTXO>;
  output0: IOutput;
  output1: IOutput;
  output2: IOutput;
  output3: IOutput;
  txData: number;
  metadata: string;
}

export interface ITypedData {
  types: ITypedDataTypes;
  domain: ITypedDataDomainData;
  primaryType: string;
  message: ITypedDataMessage;
}

export interface ISignedTypedData extends ITypedData{
  signatures: Array<string>;
}

export interface IRequestBody {
  id?: string | number;
  jsonrpc?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface IRequestOptions {
  url: string;
  body?: IRequestBody;
  proxyUrl?: string;
}

export interface IBalance {
  amount: IComplexAmount;
  currency: string;
}


export interface IDepositFilter extends IPagination {
  address?: string;
}

export interface IDepositInfo {
  event_type: string;
  inserted_at: string;
  eth_height: number;
  log_index: number;
  root_chain_txhash: string;
  txoutputs: Array<IUTXO>;
}

export interface IFeeInfo {
  amount: number;
  currency: string;
  pegged_amount: number;
  pegged_currency: string;
  pegged_subunit_to_unit: number;
  subunit_to_unit: number;
  updated_at: string;
}

export interface IInFlightExitGetInputChallengeData {
  txbytes: string;
  inputIndex: number;
}

export interface IInFlightExitInputChallengeData {
  in_flight_txbytes: string;
  in_flight_input_index: number;
  spending_txbytes: string;
  spending_input_index: number;
  spending_sig: string;
  input_tx: string;
  input_utxo_pos: IComplexAmount;
}

export interface IInFlightExitGetOutputChallengeData {
  txbytes: string;
  outputIndex: number;
}

export interface IInFlightExitOutputChallengeData {
  in_flight_txbytes: string;
  in_flight_proof: string;
  in_flight_output_pos: number;
  spending_txbytes: string;
  spending_input_index: number;
  spending_sig: string;
}

export interface IInFlightExitCompetitor {
  input_tx: string;
  input_utxo_pos: IComplexAmount;
  in_flight_txbytes: string;
  in_flight_input_index: number;
  competing_txbytes: string;
  competing_input_index: number;
  competing_tx_pos: IComplexAmount;
  competing_proof: string;
  competing_sig: string;
}

export interface IInFlightExitCanonicalProof {
  in_flight_txbytes: string;
  in_flight_tx_pos: IComplexAmount;
  in_flight_proof: string;
}

export interface IByzantineEvent {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
}

export interface IStatus {
  byzantine_events: Array<IByzantineEvent>;
  contract_addr: {
    erc20_vault: string;
    eth_vault: string;
    payment_exit_game: string;
    plasma_framework: string;
  };
  eth_syncing: boolean;
  in_flight_exits: Array<{
    txhash: string;
    txbytes: string;
    eth_height: number;
    piggybacked_inputs: Array<number>;
    piggybacked_outputs: Array<number>;
  }>;
  last_mined_child_block_number: number;
  last_mined_child_block_timestamp: number;
  last_seen_eth_block_number: number;
  last_seen_eth_block_timestamp: number;
  last_validated_child_block_number: number;
  last_validated_child_block_timestamp: number;
  services_synced_heights: Array<{
    height: number;
    service: string;
  }>
}

export interface ITransactionFilter extends IPagination {
  address?: string;
  metadata?: string;
  blknum?: number;
}

export interface ICreateTransaction {
  owner: string;
  payments: Array<IPayment>;
  feeCurrency: string;
  metadata?: string;
}

export interface ICreatedTransaction {
  fee: IFeeDetail;
  inputs: IUTXO[];
  outputs: IOutput[];
  sign_hash: string;
  txbytes: string;
  typed_data: ITypedData,
  metadata: string;
}

export interface ICreatedTransactions {
  result: string;
  transactions: ICreatedTransaction[]
}

export interface IChallengeData {
  exit_id: IComplexAmount;
  exiting_tx: string;
  txbytes: string;
  input_index: number;
  sig: string;
}
