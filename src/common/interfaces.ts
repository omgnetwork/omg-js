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

export type IComplexAmount = string | number | BN;

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
