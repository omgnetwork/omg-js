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

import Web3 from 'web3';
import JSONBigNumber from 'omg-json-bigint';

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

async function printUtxos (): Promise<void> {
  const { owner } = getFlags('owner');
  const address = config[`${owner}_eth_address`];

  const utxos = await omgjs.getUtxos(address);
  console.log(JSONBigNumber.stringify(utxos, undefined, 2));
}

printUtxos().catch(e => console.log(e.message));
