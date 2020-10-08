import BN from 'bn.js';

// NMTODO: decide whether some of these interfaces should live with the specific module that uses it

export interface ITransactionOptions {
  from: string;
  gasLimit?: number;
  gasPrice?: string;
  privateKey?: string;
};

export interface ITransactionDetails extends ITransactionOptions {
  to?: string;
  data?: string;
  value?: string;
};

export interface ITransactionReceipt {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: number;
  from: string;
  gasUsed: number;
  logs: object[];
  root: string;
  to: string;
  transactionHash: string;
  transactionIndex: number;
};

export type IComplexAmount = string | number | BN;

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
};

export interface IOutput {
  outputType: number;
  outputGuard: string;
  currency: string;
  amount: IComplexAmount;
};

export interface ITransactionData {
  txindex: number;
  txhash: string;
  metadata: string;
  txbytes: string;
  block: object;
  inputs: IUTXO[];
  outputs: IOutput[];
};

export interface ITransactionBody {
  txType: number;
  inputs: IUTXO[];
  outputs: IOutput[];
  txData: number;
  metadata: string;
};

export interface IDepositTransaction {
  owner: string;
  amount: IComplexAmount;
  currency: string;
};

export interface ITypedData {
  types: object;
  domain: object;
  primaryType: string;
  message: object;
};

export interface IBalance {
  amount: IComplexAmount;
  currency: string;
};

export interface IExitData {
  proof: string;
  txbytes: string;
  utxo_pos: number;
};

export interface IPayment {
  owner: string;
  currency: string;
  amount: IComplexAmount;
};

export interface IFee {
  currency: string;
};

export interface IFeeInfo {
  amount: number;
  currency: string;
  pegged_amount: number;
  pegged_currency: string;
  pegged_subunit_to_unit: number;
  subunit_to_unit: number;
  updated_at: string;
};

export interface IPagination {
  limit?: number;
  page?: number;
};

export interface ITransactionFilter extends IPagination {
  address?: string;
  metadata?: string;
  blknum?: number;
};

export interface IDepositFilter extends IPagination {
  address?: string;
};

// NMTODO: figure out this interface
export interface IDepositInfo {};

// NMTODO: figure out this interface
export interface IChallengeData {};
