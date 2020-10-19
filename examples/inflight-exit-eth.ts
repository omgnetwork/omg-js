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

async function inFlightExitEth (): Promise<void> {
  const { from, to, amount } = getFlags('from', 'to', 'amount');
  const fromAddress: string = config[`${from}_eth_address`];
  const fromPk: string = config[`${from}_eth_address_private_key`];
  const toAddress: string = config[`${to}_eth_address`];
  const toPk: string = config[`${to}_eth_address_private_key`];
  const transferAmount = web3Utils.toWei(amount, 'ether');

  const rootchainBalance = await omgjs.getRootchainETHBalance(toAddress);
  const etherBalance = web3Utils.fromWei(String(rootchainBalance), 'ether');
  if (Number(etherBalance) < 0.001) {
    console.log('The --to address doesnt have enough ETH on the rootchain to start an exit');
    return;
  }

  const createdTxn = await omgjs.createTransaction({
    owner: fromAddress,
    payments: [{
      owner: toAddress,
      currency: OmgJS.currency.ETH,
      amount: Number(transferAmount.toString())
    }],
    feeCurrency: OmgJS.currency.ETH
  });
  console.log(`Created a childchain transaction of ${web3Utils.fromWei(transferAmount.toString(), 'ether')} ETH`);

  // type/sign/build/submit
  const typedData = omgjs.getTypedData(createdTxn.transactions[0]);
  const signatures = omgjs.signTransaction({ typedData, privateKeys: [fromPk] });
  const signedTxn = omgjs.buildSignedTransaction({ typedData, signatures });
  console.log('Transaction created but not submitted');

  // Bob hasn't seen the transaction get put into a block and he wants to exit his output.
  // check if queue exists for this token
  const hasToken = await omgjs.hasExitQueue(OmgJS.currency.ETH);
  if (!hasToken) {
    console.log(`Adding a ETH exit queue`);
    await omgjs.addExitQueue({
      currency: OmgJS.currency.ETH,
      txOptions: {
        from: toAddress,
        privateKey: toPk
      }
    });
  }

  // start an in-flight exit
  const exitData = await omgjs.inFlightExitGetData(OmgJS.util.prefixHex(signedTxn));

  const exitReceipt = await omgjs.startInFlightExit({
    inFlightTx: exitData.in_flight_tx,
    inputTxs: exitData.input_txs,
    inputUtxosPos: exitData.input_utxos_pos,
    inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
    inFlightTxSigs: exitData.in_flight_tx_sigs,
    txOptions: {
      privateKey: toPk,
      from: toAddress
    }
  });
  console.log(`${to} started an inflight exit: ', ${exitReceipt.transactionHash}`);

  const exitId = await omgjs.getInFlightExitId(exitData.in_flight_tx);
  console.log('Exit id: ', exitId);

  // Decode the transaction to get the index of Bob's output
  const outputIndex = createdTxn.transactions[0].outputs.findIndex(
    e => e.owner.toLowerCase() === toAddress.toLowerCase()
  );

  // Bob needs to piggyback his output on the in-flight exit
  await omgjs.piggybackInFlightExitOnOutput({
    inFlightTx: exitData.in_flight_tx,
    outputIndex: outputIndex,
    txOptions: {
      privateKey: toPk,
      from: toAddress
    }
  });
  console.log('Output piggybacked');

  // wait for challenge period to complete
  const minExitPeriod = await omgjs.getMinimumExitPeriod();
  await wait(Number(minExitPeriod) * 1000 * 2);

  // call processExits() after challenge period is over
  const processExitsPostChallengeReceipt = await omgjs.processExits({
    currency: OmgJS.currency.ETH,
    exitId: 0,
    maxExitsToProcess: 20,
    txOptions: {
      privateKey: toPk,
      from: toAddress
    }
  });

  await omgjs.waitForRootchainTransaction({
    transactionHash: processExitsPostChallengeReceipt.transactionHash,
    checkIntervalMs: config.millis_to_wait_for_next_block,
    blocksToWait: config.blocks_to_wait_for_txn,
    onCountdown: (remaining) => console.log(`${remaining} blocks remaining before confirmation`)
  });
  console.log('Exits processed');
}

inFlightExitEth().catch(e => console.log(e.message));
