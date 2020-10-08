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

export interface ICreateTransaction {
  owner: string;
  payments: Array<Interfaces.IPayment>;
  fee: Interfaces.IFee;
  metadata: string;
}

// NMTODO: figure out this interface
export interface ICreatedTransactions {}

export async function createTransaction ({
  owner,
  payments,
  fee,
  metadata
}: ICreateTransaction): Promise<ICreatedTransactions> {
  // NMTODO: implement transaction helpers
  // const _metadata = metadata
  //   ? transaction.encodeMetadata(metadata)
  //   : transaction.NULL_METADATA

  return Transporter.post({
    url: `${this.watcherUrl}/transaction.create`,
    body: {
      owner,
      payments,
      fee,
      metadata
    },
    proxyUrl: this.watcherProxyUrl
  });
}
