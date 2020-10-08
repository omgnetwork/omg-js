import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

// NMTODO: figure out this interface
export interface IStatus {};

export async function getStatus (): Promise<IStatus> {
  return Transporter.post({
    url: `${this.watcherUrl}/status.get`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}
