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

import Web3 from 'web3';

import OmgJS from '..';

import { getFlags } from './util';
import config from './util/config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

async function mergeUtxos (): Promise<void> {
  const { owner }: { owner: string } = getFlags('owner');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  const utxos = await omgjs.getUtxos(address);
  const utxosToMerge = utxos
    .filter((u) => u.currency === OmgJS.currency.ETH)
    .slice(0, 4);

  if (utxosToMerge.length < 2) {
    throw Error('Not enough eth utxos to do a merge');
  }

  console.log(`there are ${utxosToMerge.length} eth utxos`);

  const mergeResult = await omgjs.mergeUtxos({
    utxos: utxosToMerge,
    privateKey: pk
  });

  console.log('merge utxo transaction completed: ', mergeResult.txhash);
  console.log('waiting for merge confirmation...');

  await omgjs.waitForUtxo({
    address,
    txindex: mergeResult.txindex,
    blknum: mergeResult.blknum,
    oindex: 0
  });
  const newUtxos = await omgjs.getUtxos(address);
  const newEthUtxos = newUtxos.filter(u => u.currency === OmgJS.currency.ETH);
  console.log(`there are now ${newEthUtxos.length} eth utxos`);
}

mergeUtxos().catch(e => console.log(e.message));
