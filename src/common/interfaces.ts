import BN from 'bn.js';

export type IComplexAmount = string | number | BN;

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
  owner?: string;
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
  txType?: number;
  inputs: IUTXO[];
  outputs: IOutput[];
  txData?: number;
  metadata: string;
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

export interface IFeeDetail {
  currency: string;
  amount: IComplexAmount;
};

export interface IPagination {
  limit?: number;
  page?: number;
};
