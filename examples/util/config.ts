/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import dotenv from 'dotenv';
import OmgJS from '../..';

dotenv.config();

export default {
  eth_node: process.env.ETH_NODE,
  watcher_url: process.env.WATCHER_URL,
  watcher_proxy_url: process.env.WATCHER_PROXY_URL,
  plasmaframework_contract_address: OmgJS.util.prefixHex(process.env.PLASMAFRAMEWORK_CONTRACT_ADDRESS),
  erc20_contract_address: process.env.ERC20_CONTRACT_ADDRESS
    ? OmgJS.util.prefixHex(process.env.ERC20_CONTRACT_ADDRESS)
    : undefined,
  alice_eth_address: OmgJS.util.prefixHex(process.env.ALICE_ETH_ADDRESS),
  alice_eth_address_private_key: OmgJS.util.prefixHex(process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY),
  bob_eth_address: OmgJS.util.prefixHex(process.env.BOB_ETH_ADDRESS),
  bob_eth_address_private_key: OmgJS.util.prefixHex(process.env.BOB_ETH_ADDRESS_PRIVATE_KEY),
  millis_to_wait_for_next_block: Number(process.env.MILLIS_TO_WAIT_FOR_NEXT_BLOCK) || 1000,
  blocks_to_wait_for_txn: Number(process.env.BLOCKS_TO_WAIT_FOR_TXN) || 13
}
