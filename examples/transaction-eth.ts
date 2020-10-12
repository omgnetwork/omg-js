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

import getFlags from './parse-args';
import config from './config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

async function logBalances (address: string) {
  const balanceArray = await omgjs.getBalance(address);
  const ethObject = balanceArray.find(i => i.currency === OmgJS.currency.ETH);
  const childchainEthBalance = ethObject
    ? `${web3Utils.fromWei(String(ethObject.amount))} ETH`
    : '0 ETH';

  console.log(`Recipient childchain ETH balance: ${childchainEthBalance}`);
  return { ethBalance: ethObject ? ethObject.amount : 0 };
}

async function transactionEth (): Promise<void> {
  const { from, to, amount } = getFlags('from', 'to', 'amount');
  const fromAddress: string = config[`${from}_eth_address`];
  const fromPk: string = config[`${from}_eth_address_private_key`];
  const toAddress: string = config[`${to}_eth_address`];
  const transferAmount: BN = new BN(web3Utils.toWei(amount, 'ether').toString());

  const { ethBalance } = await logBalances(toAddress);
  console.log('-----');

  const createdTxn = await omgjs.createTransaction({
    owner: fromAddress,
    payments: [{
      owner: toAddress,
      currency: OmgJS.currency.ETH,
      amount: transferAmount
    }],
    feeCurrency: OmgJS.currency.ETH,
    metadata: 'hello'
  });

  console.log(`Created a childchain transaction of ${transferAmount} ETH`);

  // type/sign/build/submit
  const transactionBody = createdTxn.transactions[0];
  const typedData = omgjs.getTypedData(transactionBody);
  const privateKeys = new Array(transactionBody.inputs.length).fill(fromPk);
  const signatures = omgjs.signTransaction({ typedData, privateKeys });
  const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
  const receipt = await omgjs.submitTransaction(signedTxn);

  console.log('Transaction submitted: ', receipt.txhash);

  // wait for transaction to be recorded by the watcher
  console.log('Waiting for transaction to be recorded by the watcher...');
  const expectedAmount = transferAmount.add(new BN(ethBalance.toString()));
  await omgjs.waitForChildchainBalance({
    address: toAddress,
    expectedAmount,
    currency: OmgJS.currency.ETH
  });

  console.log('-----');
  await logBalances(toAddress);
}

transactionEth();
