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

import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export interface IDepositFilter extends Interfaces.IPagination {
  address?: string;
};

export interface IDepositInfo {
  event_type: string;
  inserted_at: string;
  eth_height: number;
  log_index: number;
  root_chain_txhash: string;
  txoutputs: Array<Interfaces.IUTXO>;
};

/** @internal */
export async function getDeposits (
  filters: IDepositFilter
): Promise<Array<IDepositInfo>> {
  return Transporter.post({
    url: `${this.watcherUrl}/deposit.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}
