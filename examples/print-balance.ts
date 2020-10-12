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
import web3Utils from 'web3-utils';

import OmgJS from '..';

import getFlags from './parse-args';
import config from './config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

async function printBalance (): Promise<void> {
  const { owner } = getFlags('owner');
  const address = config[`${owner}_eth_address`];

  const balanceArray = await omgjs.getBalance(address);
  const childchainBalance = balanceArray.map(i => {
    return {
      currency: i.currency === OmgJS.currency.ETH ? 'ETH' : i.currency,
      amount: i.currency === OmgJS.currency.ETH ? `${web3Utils.fromWei(i.amount.toString())} ETH` : i.amount
    }
  });
  const rootchainBalance = await omgjs.web3Instance.eth.getBalance(address);
  const rootchainBalances = [
    {
      currency: 'ETH',
      amount: `${web3Utils.fromWei(String(rootchainBalance), 'ether')} ETH`
    }
  ];

  if (config.erc20_contract_address) {
    const aliceRootchainERC20Balance = await omgjs.getRootchainERC20Balance({
      address,
      erc20Address: config.erc20_contract_address
    });
    rootchainBalances.push({
      currency: config.erc20_contract_address,
      amount: aliceRootchainERC20Balance
    });
  }

  console.log(`Rootchain balance: ${JSON.stringify(rootchainBalances, null, 2)}`);
  console.log(`Childchain balance: ${JSON.stringify(childchainBalance, null, 2)}`);
}

printBalance();
