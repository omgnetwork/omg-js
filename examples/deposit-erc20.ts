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

import { wait, getFlags } from './util';
import config from './util/config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

async function logBalances (address: string): Promise<void> {
  const rootchainERC20Balance = await omgjs.getRootchainERC20Balance({
    address,
    erc20Address: config.erc20_contract_address
  });
  const childchainBalanceArray = await omgjs.getBalance(address);
  const erc20Object = childchainBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase());
  const childchainERC20Balance = erc20Object ? erc20Object.amount : 0;

  console.log(`Rootchain ERC20 balance: ${rootchainERC20Balance}`);
  console.log(`Childchain ERC20 balance: ${childchainERC20Balance}`);
}

async function depositErc20 () {
  const { owner, amount } = getFlags('owner', 'amount');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  if (!config.erc20_contract_address) {
    throw Error('Please define an ERC20 contract address in your .env');
  }

  await logBalances(address);
  console.log('-----');

  console.log('Approving ERC20 for deposit...');
  const approveRes = await omgjs.approveERC20Deposit({
    erc20Address: config.erc20_contract_address,
    amount,
    txOptions: {
      from: address,
      privateKey: pk
    }
  });
  console.log('ERC20 approved: ', approveRes.transactionHash);

  console.log(`Depositing ${amount} ERC20 from the rootchain to the childchain`);
  const transactionReceipt = await omgjs.deposit({
    amount,
    currency: config.erc20_contract_address,
    txOptions: {
      from: address,
      privateKey: pk
    }
  });
  console.log('Deposit successful: ', transactionReceipt.transactionHash);

  console.log('Waiting for transaction to be recorded by the watcher...');
  await omgjs.waitForRootchainTransaction({
    transactionHash: transactionReceipt.transactionHash,
    checkIntervalMs: config.millis_to_wait_for_next_block,
    blocksToWait: config.blocks_to_wait_for_txn,
    onCountdown: remaining => console.log(`${remaining} blocks remaining before confirmation`)
  });

  await wait(5000);
  console.log('-----');
  await logBalances(address);
}

depositErc20().catch(e => console.log(e.message));
