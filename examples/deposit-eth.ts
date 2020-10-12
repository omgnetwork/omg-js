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
import BN from 'bn.js';
import web3Utils from 'web3-utils';

import OmgJS from '..';

import { wait } from './wait';
import getFlags from './parse-args';
import config from './config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

async function logBalances (address: string): Promise<void> {
  const rootchainBalance = await omgjs.web3Instance.eth.getBalance(address);
  const childchainBalanceArray = await omgjs.getBalance(address);
  const ethObject = childchainBalanceArray.find(i => i.currency === OmgJS.currency.ETH);
  const childchainETHBalance = ethObject
    ? `${web3Utils.fromWei(ethObject.amount.toString())} ETH`
    : '0 ETH';

  console.log(`Rootchain ETH balance: ${web3Utils.fromWei(rootchainBalance, 'ether')} ETH`);
  console.log(`Childchain ETH balance: ${childchainETHBalance}`);
}

async function depositEth (): Promise<void> {
  const { owner, amount } = getFlags('owner', 'amount');
  const depositAmount = web3Utils.toWei(amount, 'ether');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  await logBalances(address);
  console.log('-----');

  console.log(`Depositing ${web3Utils.fromWei(depositAmount.toString(), 'ether')} ETH from the rootchain to the childchain`);
  const depositResult = await omgjs.deposit({
    amount: depositAmount,
    txOptions: {
      from: address,
      privateKey: pk
    }
  });

  console.log('Deposit successful: ', depositResult.transactionHash);

  console.log('Waiting for transaction to be recorded by the watcher...');
  await omgjs.waitForRootchainTransaction({
    transactionHash: depositResult.transactionHash,
    checkIntervalMs: config.millis_to_wait_for_next_block,
    blocksToWait: config.blocks_to_wait_for_txn,
    onCountdown: remaining => console.log(`${remaining} blocks remaining before confirmation`)
  });

  await wait(5000);
  console.log('-----');
  await logBalances(address);
}

depositEth();
