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
import BN from 'bn.js';

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

async function logBalances (address: string): Promise<{ erc20Balance: number | string | BN }> {
  const balanceArray = await omgjs.getBalance(address);
  const erc20Object = balanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase());
  const childchainErc20Balance = erc20Object ? erc20Object.amount : 0;

  console.log(`Childchain ERC20 balance: ${childchainErc20Balance}`);
  return { erc20Balance: childchainErc20Balance };
}

async function transactionErc20 (): Promise<void> {
  if (!config.erc20_contract_address) {
    console.log('Please define an ERC20 contract address in your .env');
    return;
  }

  const { from, to, amount } = getFlags('from', 'to', 'amount');
  const fromAddress: string = config[`${from}_eth_address`];
  const fromPk: string = config[`${from}_eth_address_private_key`];
  const toAddress: string = config[`${to}_eth_address`];

  const { erc20Balance } = await logBalances(toAddress);
  console.log('-----');

  const createdTxn = await omgjs.createTransaction({
    owner: fromAddress,
    payments: [{
      owner: toAddress,
      currency: config.erc20_contract_address,
      amount: Number(amount)
    }],
    feeCurrency: OmgJS.currency.ETH,
    metadata: 'hello world'
  });

  console.log(`Created a childchain transaction of ${amount} ERC20`);

  // type/sign/build/submit
  const transactionBody = createdTxn.transactions[0];
  const typedData = omgjs.getTypedData(transactionBody);
  const privateKeys = new Array(transactionBody.inputs.length).fill(fromPk);
  const signatures = omgjs.signTransaction({ typedData, privateKeys });
  const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
  const receipt = await omgjs.submitTransaction(signedTxn);

  console.log('Transaction submitted: ', receipt.txhash);

  console.log('Waiting for transaction to be recorded by the watcher...');
  const expectedAmount = Number(amount) + Number(erc20Balance)
  await omgjs.waitForChildchainBalance({
    address: toAddress,
    expectedAmount,
    currency: config.erc20_contract_address
  });

  console.log('-----');
  await logBalances(toAddress);
}

transactionErc20().catch(e => console.log(e.message));
