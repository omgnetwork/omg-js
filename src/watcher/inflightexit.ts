import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';
import * as Util from '@lib/common/util';

export interface IInFlightExitGetInputChallengeData {
  txbytes: string;
  inputIndex: number;
};

// NMTODO: figure out this interface
export interface IInflightExitInputChallengeData {};

export async function inFlightExitGetInputChallengeData ({
  txbytes,
  inputIndex
}: IInFlightExitGetInputChallengeData): Promise<IInflightExitInputChallengeData> {
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

// NMTODO: figure out this interface
export interface IInflightExitOutputChallengeData {};

export async function inFlightExitGetOutputChallengeData ({
  txbytes,
  outputIndex
}: IInFlightExitGetOutputChallengeData): Promise<IInflightExitOutputChallengeData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_output_challenge_data`,
    body: {
      txbytes: Util.prefixHex(txbytes),
      output_index: outputIndex
    },
    proxyUrl: this.watcherProxyUrl
  });
}

export async function inFlightExitGetData (txbytes: string): Promise<Interfaces.IExitData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_data`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}

// NMTODO: figure out this interface
export interface IInflightExitCompetitor {};

export async function inFlightExitGetCompetitor (txbytes: string): Promise<IInflightExitCompetitor> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.get_competitor`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}

export async function inFlightExitProveCanonical (txbytes: string): Promise<string> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/in_flight_exit.prove_canonical`,
    body: {
      txbytes: Util.prefixHex(txbytes)
    },
    proxyUrl: this.watcherProxyUrl
  });
}
