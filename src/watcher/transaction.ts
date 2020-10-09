import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';
import * as Encoders from '@lib/transaction/encoders';

export async function getTransaction (id: string): Promise<Interfaces.ITransactionData> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.get`,
    body: { id },
    proxyUrl: this.watcherProxyUrl
  });
}

export interface ITransactionFilter extends Interfaces.IPagination {
  address?: string;
  metadata?: string;
  blknum?: number;
};

export async function getTransactions (
  filters: ITransactionFilter
): Promise<Array<Interfaces.ITransactionData>> {
  return Transporter.post({
    url: `${this.watcherUrl}/transaction.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}

export interface ICreateTransaction {
  owner: string;
  payments: Array<Interfaces.IPayment>;
  feeCurrency: string;
  metadata: string;
}

// NMTODO: figure out this interface
export interface ICreatedTransactions {}

export async function createTransaction ({
  owner,
  payments,
  feeCurrency,
  metadata
}: ICreateTransaction): Promise<ICreatedTransactions> {
  const _metadata = metadata
    ? Encoders.encodeMetadata(metadata)
    : Constants.NULL_METADATA

  return Transporter.post({
    url: `${this.watcherUrl}/transaction.create`,
    body: {
      owner,
      payments,
      fee: { currency: feeCurrency },
      metadata: _metadata
    },
    proxyUrl: this.watcherProxyUrl
  });
}
