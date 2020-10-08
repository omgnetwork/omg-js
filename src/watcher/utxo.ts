import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export async function getExitData (utxo: Interfaces.IUTXO): Promise<Interfaces.IExitData> {
  // NMTODO: write transaction helpers
  // const utxoPos = transaction.encodeUtxoPos(utxo)
  const utxoPos = 1;

  return Transporter.post({
    url: `${this.watcherSecurityUrl}/utxo.get_exit_data`,
    body: { utxo_pos: utxoPos },
    proxyUrl: this.watcherProxyUrl
  });
}
