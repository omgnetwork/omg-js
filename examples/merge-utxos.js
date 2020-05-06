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
const wait = require('./wait.js')
const getFlags = require('./parse-args')
const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  plasmaContractAddress: config.plasmaframework_contract_address
})

async function mergeUtxos () {
  try {
    const { owner } = getFlags('owner')
    const address = config[`${owner}_eth_address`]
    const pk = config[`${owner}_eth_address_private_key`]

    const utxos = await childChain.getUtxos(address)
    const utxosToMerge = utxos
      .filter((u) => u.currency === transaction.ETH_CURRENCY)
      .slice(0, 4)

    if (utxosToMerge.length < 2) {
      throw Error('Not enough eth utxos to do a merge')
    }

    console.log(`there are ${utxosToMerge.length} eth utxos`)
    const mergeResult = await childChain.mergeUtxos({
      utxos: utxosToMerge,
      privateKey: pk
    })

    console.log('merge utxo transaction result', JSON.stringify(mergeResult, undefined, 2))
    await wait.waitForUtxo(childChain, address, { ...mergeResult, oindex: 0 })
    const newUtxos = await childChain.getUtxos(address)
    const newEthUtxos = newUtxos.filter(u => u.currency === transaction.ETH_CURRENCY)
    console.log(`there are now ${newEthUtxos.length} eth utxos`)
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

mergeUtxos()
