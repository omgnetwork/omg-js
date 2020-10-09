import * as Transporter from '@lib/transport';

export interface IStatus {
  byzantine_events: Array<any>;
  contract_addr: {
    erc20_vault: string;
    eth_vault: string;
    payment_exit_game: string;
    plasma_framework: string;
  };
  eth_syncing: boolean;
  in_flight_exits: Array<any>;
  last_mined_child_block_number: number;
  last_mined_child_block_timestamp: number;
  last_seen_eth_block_number: number;
  last_seen_eth_block_timestamp: number;
  last_validated_child_block_number: number;
  last_validated_child_block_timestamp: number;
  services_synced_heights: Array<{
    height: number;
    service: string;
  }>
};

export async function getStatus (): Promise<IStatus> {
  return Transporter.post({
    url: `${this.watcherUrl}/status.get`,
    body: {},
    proxyUrl: this.watcherProxyUrl
  });
}
