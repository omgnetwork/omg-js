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

import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';
import * as Encoders from '@lib/transaction/encoders';
import * as TypedDataModule from '@lib/transaction/typedData';
import * as Util from '@lib/common/util';

/** @internal */
export async function getTransaction (id: string): Promise<Interfaces.ITransactionData> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.get`,
    body: { id },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface ITransactionFilter extends Interfaces.IPagination {
  address?: string;
  metadata?: string;
  blknum?: number;
};

/** @internal */
export async function getTransactions (
  filters: ITransactionFilter
): Promise<Array<Interfaces.ITransactionData>> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}

export interface ICreateTransaction {
  owner: string;
  payments: Array<Interfaces.IPayment>;
  feeCurrency: string;
  metadata?: string;
}

export interface ICreatedTransaction {
  fee: Interfaces.IFeeDetail;
  inputs: Interfaces.IUTXO[];
  outputs: Interfaces.IOutput[];
  sign_hash: string;
  txbytes: string;
  typed_data: TypedDataModule.ITypedData,
  metadata: string;
}

export interface ICreatedTransactions {
  result: string;
  transactions: ICreatedTransaction[]
}

/** @internal */
export async function createTransaction ({
  owner,
  payments,
  feeCurrency,
  metadata
}: ICreateTransaction): Promise<ICreatedTransactions> {
  const _metadata = metadata
    ? Encoders.encodeMetadata(metadata)
    : Constants.NULL_METADATA

  return Transporter.post({
    url: `${this.watcherUrl}/transaction.create`,
    body: {
      owner,
      payments,
      fee: { currency: feeCurrency },
      metadata: _metadata
    },
    proxyUrl: this.watcherProxyUrl
  });
}

/** @internal */
export async function submitTypedData (
  typedData: TypedDataModule.ISignedTypedData
): Promise<Interfaces.IWatcherTransactionReceipt> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.submit_typed`,
    body: typedData,
    proxyUrl: this.watcherProxyUrl
  });
}

/** @internal */
export async function submitTransaction (
  transaction: string
): Promise<Interfaces.IWatcherTransactionReceipt> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/transaction.submit`,
    body: { transaction: Util.prefixHex(transaction) },
    proxyUrl: this.watcherProxyUrl
  });
}
