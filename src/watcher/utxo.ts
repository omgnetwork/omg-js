import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';
import * as Encoders from '@lib/transaction/encoders';

export async function getExitData (utxo: Interfaces.IUTXO): Promise<Interfaces.IExitData> {
  const utxoPos = Encoders.encodeUtxoPos(utxo);

  return Transporter.post({
    url: `${this.watcherSecurityUrl}/utxo.get_exit_data`,
    body: { utxo_pos: utxoPos },
    proxyUrl: this.watcherProxyUrl
  });
}

// NMTODO: figure out this interface
export interface IChallengeData {};

export async function getChallengeData (utxoPos: number): Promise<IChallengeData> {
  return Transporter.post({
    url: `${this.watcherSecurityUrl}/utxo.get_challenge_data`,
    body: { utxo_pos: utxoPos },
    proxyUrl: this.watcherProxyUrl
  });
}
