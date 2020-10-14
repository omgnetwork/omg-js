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
  const rootchainBalance = await omgjs.getRootchainERC20Balance({
    address,
    erc20Address: config.erc20_contract_address
  });
  const childchainBalanceArray = await omgjs.getBalance(address);
  const erc20Object = childchainBalanceArray.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase());
  const childchainBalance = erc20Object ? erc20Object.amount : 0;

  console.log(`Rootchain ERC20 balance: ${rootchainBalance}`);
  console.log(`Childchain ERC20 balance: ${childchainBalance}`);
}

async function exitErc20 (): Promise<void> {
  if (!config.erc20_contract_address) {
    console.log('Please define an ERC20 contract in your .env');
    return;
  }
  const { owner }: { owner: string} = getFlags('owner');
  const address: string = config[`${owner}_eth_address`];
  const pk: string = config[`${owner}_eth_address_private_key`];

  const rootchainBalance = await omgjs.getRootchainETHBalance(address);
  const etherBalance = web3Utils.fromWei(rootchainBalance.toString(), 'ether');
  if (Number(etherBalance) < 0.001) {
    console.log('Not enough ETH on the rootchain to start an exit');
    return;
  }
  await logBalances(address);
  console.log('-----');

  // get a ERC20 UTXO and exit data
  const utxos = await omgjs.getUtxos(address);
  const utxoToExit = utxos.find(i => i.currency.toLowerCase() === config.erc20_contract_address.toLowerCase());
  if (!utxoToExit) {
    console.log('No ERC20 UTXOs to exit');
    return;
  }

  console.log(`Exiting ${utxoToExit.amount} ERC20 with this UTXO:\n${JSON.stringify(utxoToExit, undefined, 2)}`);

  // check if queue exists for this token
  const hasToken = await omgjs.hasExitQueue(config.erc20_contract_address);
  if (!hasToken) {
    console.log(`Adding a ${config.erc20_contract_address} exit queue`)
    await omgjs.addExitQueue({
      currency: config.erc20_contract_address,
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
    currency: config.erc20_contract_address,
    exitId: 0,
    maxExitsToProcess: 20,
    txOptions: {
      privateKey: pk,
      from: address
    }
  });

  if (processExitReceipt) {
    console.log(`ERC20 exits processing: ${processExitReceipt.transactionHash}`)
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

exitErc20().catch(e => console.log(e.message));
