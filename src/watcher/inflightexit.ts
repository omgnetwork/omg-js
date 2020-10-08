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
