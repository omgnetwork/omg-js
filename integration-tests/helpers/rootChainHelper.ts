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
import promiseRetry from 'promise-retry';
import BN from 'bn.js';

import OmgJS from '../..';

import config from '../test-config';

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

export interface ITxDetails {
  gas: number;
  gasPrice: string;
  from: string;
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface ITxReceipt {
  transactionHash: string;
  gasUsed: number;
}

export function createAccount (): { address: string, privateKey: string } {
  const ret = omgjs.web3Instance.eth.accounts.create();
  ret.address = ret.address.toLowerCase();
  return ret;
}

export async function setGas (txDetails: Partial<ITxDetails>): Promise<void> {
  if (!txDetails.gas) {
    try {
      txDetails.gas = await omgjs.web3Instance.eth.estimateGas(txDetails);
    } catch (err) {
      throw new Error(`Error estimating gas: ${err}`);
    }
  }
  if (!txDetails.gasPrice) {
    try {
      txDetails.gasPrice = await omgjs.web3Instance.eth.getGasPrice();
    } catch (err) {
      txDetails.gasPrice = '1000000000';
      console.warn('Error getting gas price: ', err);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendTransaction (txDetails: Partial<ITxDetails>, privateKey: string): Promise<any> {
  await setGas(txDetails);
  if (!privateKey) {
    return omgjs.web3Instance.eth.sendTransaction(txDetails);
  } else {
    const signedTx = await omgjs.web3Instance.eth.accounts.signTransaction(txDetails, privateKey);
    return omgjs.web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction);
  }
}

export async function spentOnGas (receipt: Partial<ITxReceipt>): Promise<BN> {
  const tx = await omgjs.web3Instance.eth.getTransaction(receipt.transactionHash);
  return new BN(tx.gasPrice.toString()).muln(receipt.gasUsed);
}

export function waitForEthBalance (address: string, callback: (string) => boolean): Promise<void> {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ETH balance...  (${number})`);
    const resp = await omgjs.getRootchainETHBalance(address);
    if (!callback(resp)) {
      retry();
    }
    return resp;
  }, {
    minTimeout: 2000,
    factor: 1,
    retries: 30
  });
}

export function waitForEthBalanceEq (address: string, expectedAmount: number | BN | string): Promise<void> {
  const expectedBn = new BN(expectedAmount.toString());
  return waitForEthBalance(address, balance => new BN(balance.toString()).eq(expectedBn));
}

export function waitForERC20Balance (address: string, contractAddress: string, callback: (string) => boolean): Promise<void> {
  return promiseRetry(async (retry, number) => {
    console.log(`Waiting for ERC20 balance...  (${number})`);
    const resp = await omgjs.getRootchainERC20Balance({ erc20Address: contractAddress, address });
    if (!callback(resp)) {
      retry();
    }
    return resp;
  }, {
    minTimeout: 2000,
    factor: 1,
    retries: 30
  });
}

export function waitForERC20BalanceEq (address: string, contractAddress: string, expectedAmount: number | BN): Promise<void> {
  const expectedBn = new BN(expectedAmount.toString());
  return waitForERC20Balance(address, contractAddress, balance => new BN(balance.toString()).eq(expectedBn));
}

export function sleep (ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export interface IAwaitOptions {
  interval: number;
  blocksToWait: number;
}

export function awaitTx (txnHash: string, options?: IAwaitOptions): Promise<Array<void>> {
  const interval = options && options.interval ? options.interval : 1000;
  const blocksToWait = options && options.blocksToWait ? options.blocksToWait : 1;

  const transactionReceiptAsync = async function (txnHash, resolve, reject) {
    try {
      const receipt = await omgjs.web3Instance.eth.getTransactionReceipt(txnHash);
      if (!receipt) {
        setTimeout(function () {
          transactionReceiptAsync(txnHash, resolve, reject);
        }, interval);
      } else {
        if (blocksToWait > 0) {
          const resolvedReceipt = await receipt;
          if (!resolvedReceipt || !resolvedReceipt.blockNumber) {
            setTimeout(function () {
              transactionReceiptAsync(txnHash, resolve, reject);
            }, interval);
          } else {
            try {
              const block = await omgjs.web3Instance.eth.getBlock(resolvedReceipt.blockNumber);
              const current = await omgjs.web3Instance.eth.getBlock('latest');
              if (current.number - block.number >= blocksToWait) {
                const txn = await omgjs.web3Instance.eth.getTransaction(txnHash);
                if (txn.blockNumber != null) {
                  resolve(resolvedReceipt);
                } else {
                  reject(new Error('Transaction with hash: ' + txnHash + ' ended up in an uncle block.'));
                }
              } else {
                setTimeout(function () {
                  transactionReceiptAsync(txnHash, resolve, reject);
                }, interval);
              }
            } catch (e) {
              setTimeout(function () {
                transactionReceiptAsync(txnHash, resolve, reject);
              }, interval);
            }
          }
        } else resolve(receipt);
      }
    } catch (e) {
      reject(e);
    }
  };

  if (Array.isArray(txnHash)) {
    const promises = [];
    txnHash.forEach(function (oneTxHash) {
      promises.push(awaitTx(oneTxHash, options));
    });
    return Promise.all(promises);
  } else {
    return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
    });
  }
}
