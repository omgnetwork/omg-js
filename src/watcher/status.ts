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

import * as Transporter from '@lib/transport';

export interface IByzantineEvent {
  event: string;
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

/** @internal */
export async function getStatus (): Promise<IStatus> {
  return Transporter.post({
    url: `${this.watcherUrl}/status.get`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}
