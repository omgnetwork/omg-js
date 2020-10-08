import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export async function getFees (): Promise<Interfaces.IFeeInfo> {
  return Transporter.post({
    url: `${this.watcherUrl}/fees.all`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}
