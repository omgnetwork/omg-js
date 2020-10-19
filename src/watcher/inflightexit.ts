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
import * as Util from '@lib/common/util';

export interface IInFlightExitGetInputChallengeData {
  txbytes: string;
  inputIndex: number;
};

export interface IInFlightExitInputChallengeData {
  in_flight_txbytes: string;
  in_flight_input_index: number;
  spending_txbytes: string;
  spending_input_index: number;
  spending_sig: string;
  input_tx: string;
  input_utxo_pos: Interfaces.IComplexAmount;
};

/** @internal */
export async function inFlightExitGetInputChallengeData ({
  txbytes,
  inputIndex
}: IInFlightExitGetInputChallengeData): Promise<IInFlightExitInputChallengeData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_input_challenge_data`,
    body: {
      txbytes: Util.prefixHex(txbytes),
      input_index: inputIndex
    },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface IInFlightExitGetOutputChallengeData {
  txbytes: string;
  outputIndex: number;
};

export interface IInFlightExitOutputChallengeData {
  in_flight_txbytes: string;
  in_flight_proof: string;
  in_flight_output_pos: number;
  spending_txbytes: string;
  spending_input_index: number;
  spending_sig: string;
};

/** @internal */
export async function inFlightExitGetOutputChallengeData ({
  txbytes,
  outputIndex
}: IInFlightExitGetOutputChallengeData): Promise<IInFlightExitOutputChallengeData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_output_challenge_data`,
    body: {
      txbytes: Util.prefixHex(txbytes),
      output_index: outputIndex
    },
    proxyUrl: this.watcherProxyUrl
  });
}

/** @internal */
export async function inFlightExitGetData (txbytes: string): Promise<Interfaces.IInFlightExitData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_data`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface IInFlightExitCompetitor {
  input_tx: string;
  input_utxo_pos: Interfaces.IComplexAmount;
  in_flight_txbytes: string;
  in_flight_input_index: number;
  competing_txbytes: string;
  competing_input_index: number;
  competing_tx_pos: Interfaces.IComplexAmount;
  competing_proof: string;
  competing_sig: string;
};

/** @internal */
export async function inFlightExitGetCompetitor (txbytes: string): Promise<IInFlightExitCompetitor> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_competitor`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface IInFlightExitCanonicalProof {
  in_flight_txbytes: string;
  in_flight_tx_pos: Interfaces.IComplexAmount;
  in_flight_proof: string;
}

/** @internal */
export async function inFlightExitProveCanonical (txbytes: string): Promise<IInFlightExitCanonicalProof> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.prove_canonical`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}
