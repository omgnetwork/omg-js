import * as Transporter from '@lib/transport';

export interface IFeeInfo {
  amount: number;
  currency: string;
  pegged_amount: number;
  pegged_currency: string;
  pegged_subunit_to_unit: number;
  subunit_to_unit: number;
  updated_at: string;
};

/** @internal */
export async function getFees (): Promise<IFeeInfo> {
  return Transporter.post({
    url: `${this.watcherUrl}/fees.all`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}
