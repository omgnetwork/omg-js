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
  watcher_url: process.env.WATCHER_URL,
  watcher_proxy_url: process.env.WATCHER_PROXY_URL,
  childchain_url: process.env.CHILDCHAIN_URL,
  rootchain_plasma_contract_address: process.env.ROOTCHAIN_CONTRACT,
  geth_url: process.env.GETH_URL,
  alice_eth_address: process.env.ALICE_ETH_ADDRESS,
  alice_eth_address_private_key: hexPrefix(process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY),
  alice_eth_deposit_amount: process.env.ALICE_ETH_DEPOSIT_AMOUNT || '0.5',
  alice_eth_transfer_amount: process.env.ALICE_ETH_TRANSFER_AMOUNT || '0.05',
  bob_eth_address: process.env.BOB_ETH_ADDRESS,
  bob_eth_address_private_key: hexPrefix(process.env.BOB_ETH_ADDRESS_PRIVATE_KEY),
  millis_to_wait_for_next_block: process.env.MILLIS_TO_WAIT_FOR_NEXT_BLOCK || 1000,
  blocks_to_wait_for_txn: process.env.BLOCKS_TO_WAIT_FOR_TXN || 20
}

module.exports = config
