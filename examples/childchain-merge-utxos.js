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

const ChildChain = require('../packages/omg-js-childchain/src/childchain')
const transaction = require('../packages/omg-js-util/src/transaction')
const config = require('./config.js')
const JSONBigNumber = require('omg-json-bigint')
const wait = require('./wait.js')
const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
})

async function childchainMergeUtxos () {
  const aliceUtxos = await childChain.getUtxos(config.alice_eth_address)
  console.log(
    `Alice UTXOs: ${JSONBigNumber.stringify(aliceUtxos, undefined, 2)}`
  )
  console.log(`Alice UTXOs has length of ${aliceUtxos.length}`)

  const utxosToMerge = aliceUtxos
    .filter((u) => u.currency === transaction.ETH_CURRENCY)
    .slice(0, 4)
  const utxo = await childChain.mergeUtxos({
    utxos: utxosToMerge,
    privateKey: config.alice_eth_address_private_key,
    verifyingContract: config.plasmaframework_contract_address
  })

  console.log('merge utxo transaction result', utxo)
  await wait.waitForUtxo(childChain, config.alice_eth_address, utxo)
  console.log(`Alice UTXOs has length of ${aliceUtxos.length}`)
}

childchainMergeUtxos()
