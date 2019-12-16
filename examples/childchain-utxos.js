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
const config = require('./config.js')

const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

async function childchainUtxos () {
  const aliceUtxos = await childChain.getUtxos(config.alice_eth_address)
  const bobUtxos = await childChain.getUtxos(config.bob_eth_address)

  console.log(`Alice UTXOs: ${JSON.stringify(aliceUtxos, undefined, 2)}`)
  console.log(`Bob UTXOs: ${JSON.stringify(bobUtxos, undefined, 2)}`)
}

childchainUtxos()
