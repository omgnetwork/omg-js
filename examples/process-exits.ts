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
import web3Utils from 'web3-utils';

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

async function processExits (): Promise<void> {
  const { owner } = getFlags('owner');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  const rootchainBalance = await omgjs.getRootchainETHBalance(address);
  console.log(`Rootchain balance: ${web3Utils.fromWei(String(rootchainBalance), 'ether')} ETH`);
  console.log('-----');

  const ethQueue = await omgjs.getExitQueue(OmgJS.currency.ETH);
  if (ethQueue.length) {
    console.log('Current ETH exit queue: ', ethQueue);
    const ethExitReceipt = await omgjs.processExits({
      currency: OmgJS.currency.ETH,
      exitId: 0,
      maxExitsToProcess: ethQueue.length,
      txOptions: {
        privateKey: pk,
        from: address
      }
    });
    if (ethExitReceipt) {
      console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`);
      await omgjs.waitForRootchainTransaction({
        transactionHash: ethExitReceipt.transactionHash,
        checkIntervalMs: config.millis_to_wait_for_next_block,
        blocksToWait: config.blocks_to_wait_for_txn,
        onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
      });
      console.log('ETH exits processed');
    }
  } else {
    console.log('No exits in ETH exit queue to process');
  }

  if (!config.erc20_contract_address) {
    console.log('No ERC20 contract defined in config');
    return;
  }

  const hasToken = await omgjs.hasExitQueue(config.erc20_contract_address);
  if (!hasToken) {
    console.log('No exit queue exists for the ERC20 token');
    return;
  }
  const erc20Queue = await omgjs.getExitQueue(config.erc20_contract_address);
  if (erc20Queue.length) {
    console.log('Current ERC20 exit queue: ', erc20Queue);
    const erc20ExitReceipt = await omgjs.processExits({
      currency: config.erc20_contract_address,
      exitId: 0,
      maxExitsToProcess: erc20Queue.length,
      txOptions: {
        privateKey: pk,
        from: address
      }
    });
    if (erc20ExitReceipt) {
      console.log(`ERC20 exits processing: ${erc20ExitReceipt.transactionHash}`);
      await omgjs.waitForRootchainTransaction({
        transactionHash: erc20ExitReceipt.transactionHash,
        checkIntervalMs: config.millis_to_wait_for_next_block,
        blocksToWait: config.blocks_to_wait_for_txn,
        onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
      });
      console.log('ERC20 exits processed');
    }
  } else {
    console.log('No exits in ERC20 exit queue to process');
  }
}

processExits().catch(e => console.log(e.message));
