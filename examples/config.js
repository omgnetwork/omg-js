/*
    Copyright 2019 OmiseGO Pte Ltd

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

require('dotenv').config()
const { hexPrefix } = require('../packages/omg-js-util/src')

const config = {
  eth_node: process.env.ETH_NODE,
  watcher_url: process.env.WATCHER_URL,
  watcher_proxy_url: process.env.WATCHER_PROXY_URL,
  rootchain_plasma_contract_address: hexPrefix(process.env.PLASMA_FRAMEWORK),
  erc20_contract: process.env.ERC20_CONTRACT ? hexPrefix(process.env.ERC20_CONTRACT) : undefined,
  alice_eth_address: hexPrefix(process.env.ALICE_ETH_ADDRESS),
  alice_eth_address_private_key: hexPrefix(process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY),
  bob_eth_address: hexPrefix(process.env.BOB_ETH_ADDRESS),
  bob_eth_address_private_key: hexPrefix(process.env.BOB_ETH_ADDRESS_PRIVATE_KEY),
  alice_eth_deposit_amount: process.env.ALICE_ETH_DEPOSIT_AMOUNT || '0.01',
  alice_erc20_deposit_amount: process.env.ALICE_ERC20_DEPOSIT_AMOUNT || '20',
  alice_eth_transfer_amount: process.env.ALICE_ETH_TRANSFER_AMOUNT || '0.005',
  alice_erc20_transfer_amount: process.env.ALICE_ERC20_TRANSFER_AMOUNT || '5',
  millis_to_wait_for_next_block: process.env.MILLIS_TO_WAIT_FOR_NEXT_BLOCK || 1000,
  blocks_to_wait_for_txn: process.env.BLOCKS_TO_WAIT_FOR_TXN || 20
}

module.exports = config
