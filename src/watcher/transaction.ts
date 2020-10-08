import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export async function getTransaction (id: string): Promise<Interfaces.ITransactionData> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.get`,
    body: { id },
    proxyUrl: this.watcherProxyUrl
  });
}

export async function getTransactions (filters: Interfaces.ITransactionFilter): Promise<Array<Interfaces.ITransactionData>> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}
