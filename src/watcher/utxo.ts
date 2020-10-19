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
import * as Encoders from '@lib/transaction/encoders';

/** @internal */
export async function getExitData (utxo: Interfaces.IUTXO): Promise<Interfaces.IExitData> {
  const utxoPos = Encoders.encodeUtxoPos(utxo);

  return Transporter.post({
    url: `${this.watcherSecurityUrl}/utxo.get_exit_data`,
    body: { utxo_pos: utxoPos },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface IChallengeData {
  exit_id: Interfaces.IComplexAmount;
  exiting_tx: string;
  txbytes: string;
  input_index: number;
  sig: string;
}

/** @internal */
export async function getChallengeData (utxoPos: number): Promise<IChallengeData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/utxo.get_challenge_data`,
    body: { utxo_pos: utxoPos },
    proxyUrl: this.watcherProxyUrl
  });
}
