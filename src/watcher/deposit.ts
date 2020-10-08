import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export async function getDeposits (filters: Interfaces.IDepositFilter): Promise<Array<Interfaces.IDepositInfo>> {
  return Transporter.post({
    url: `${this.watcherUrl}/deposit.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}