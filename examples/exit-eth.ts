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
  const rootchainBalance = await omgjs.getRootchainETHBalance(address);
  const childchainBalanceArray = await omgjs.getBalance(address);
  const ethObject = childchainBalanceArray.find(i => i.currency === OmgJS.currency.ETH);
  const childchainEthBalance = ethObject
    ? `${web3Utils.fromWei(String(ethObject.amount))} ETH`
    : '0 ETH';

  console.log(`Rootchain balance: ${web3Utils.fromWei(String(rootchainBalance), 'ether')} ETH`);
  console.log(`Childchain balance: ${childchainEthBalance}`);
}

async function exitEth (): Promise<void> {
  const { owner }: { owner: string } = getFlags('owner');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  const rootchainBalance = await omgjs.getRootchainETHBalance(address);
  const etherBalance = web3Utils.fromWei(String(rootchainBalance), 'ether');
  if (Number(etherBalance) < 0.001) {
    console.log(`${owner} does not have enough ETH on the rootchain to start an exit`);
    return;
  }
  await logBalances(address);
  console.log('-----');

  // get ETH UTXO and exit data
  const utxos = await omgjs.getUtxos(address);
  const utxoToExit = utxos.find(i => i.currency === OmgJS.currency.ETH);
  if (!utxoToExit) {
    console.log(`${owner} doesnt have any ETH UTXOs to exit`);
    return;
  }

  console.log(`${owner} wants to exit ${web3Utils.fromWei(String(utxoToExit.amount), 'ether')} ETH with this UTXO:\n${JSON.stringify(utxoToExit, undefined, 2)}`);

  // check if queue exists for this token
  const hasQueue = await omgjs.hasExitQueue(OmgJS.currency.ETH);
  if (!hasQueue) {
    console.log(`Adding a ETH exit queue`);
    await omgjs.addExitQueue({
      currency: OmgJS.currency.ETH,
      txOptions: {
        from: address,
        privateKey: pk
      }
    });
  }

  // start a standard exit
  const exitData = await omgjs.getExitData(utxoToExit);

  const standardExitReceipt = await omgjs.startStandardExit({
    utxoPos: exitData.utxo_pos,
    outputTx: exitData.txbytes,
    inclusionProof: exitData.proof,
    txOptions: {
      privateKey: pk,
      from: address
    }
  });
  console.log('Started a standard exit: ', standardExitReceipt.transactionHash);

  const exitId = await omgjs.getStandardExitId({
    txBytes: exitData.txbytes,
    utxoPos: exitData.utxo_pos,
    isDeposit: utxoToExit.blknum % 1000 !== 0
  });
  console.log('Exit id: ', exitId);

  const { msUntilFinalization } = await omgjs.getExitTime({
    exitRequestBlockNumber: standardExitReceipt.blockNumber,
    submissionBlockNumber: utxoToExit.blknum
  });

  await wait(msUntilFinalization);
  const processExitReceipt = await omgjs.processExits({
    currency: OmgJS.currency.ETH,
    exitId: 0,
    maxExitsToProcess: 20,
    txOptions: {
      privateKey: pk,
      from: address
    }
  });

  if (processExitReceipt) {
    console.log(`ETH exits processing: ${processExitReceipt.transactionHash}`);
    await omgjs.waitForRootchainTransaction({
      transactionHash: processExitReceipt.transactionHash,
      checkIntervalMs: config.millis_to_wait_for_next_block,
      blocksToWait: config.blocks_to_wait_for_txn,
      onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
    });
  }
  console.log('Exits processed');

  console.log('-----');
  await logBalances(address);
}

exitEth().catch(e => console.log(e.message));
