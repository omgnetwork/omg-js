import * as Interfaces from '@lib/common/interfaces';
import * as Transporter from '@lib/transport';

export interface IDepositFilter extends Interfaces.IPagination {
  address?: string;
};

// NMTODO: figure out this interface
export interface IDepositInfo {};

/** @internal */
export async function getDeposits (
  filters: IDepositFilter
): Promise<Array<IDepositInfo>> {
  return Transporter.post({
    url: `${this.watcherUrl}/deposit.all`,
    body: filters,
    proxyUrl: this.watcherProxyUrl
  });
}
