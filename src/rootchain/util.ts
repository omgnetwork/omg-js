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

import web3Utils from 'web3-utils';
import promiseRetry from 'promise-retry';
import BN from 'bn.js';

import * as WatcherAccountModule from '@lib/watcher/account';
import * as Interfaces from '@lib/common/interfaces';
import * as Util from '@lib/common/util';
import * as ContractsModule from '@lib/contracts';

/** @internal */
export async function getEVMErrorReason (txhash: string): Promise<string> {
  const tx = await this.web3Instance.eth.getTransaction(txhash);
  if (tx) {
    const code = await this.web3Instance.eth.call(tx, tx.blockNumber);
    if (code && code.substr(138)) {
      return this.web3Instance.utils.toAscii(Util.prefixHex(code.substr(138)));
    }
  }
}

export interface IGetRootchainERC20Balance {
  address: string;
  erc20Address: string;
}

/** @internal */
export async function getRootchainERC20Balance ({
  address,
  erc20Address
}: IGetRootchainERC20Balance): Promise<string> {
  const { contract } = await ContractsModule.getErc20.call(this, erc20Address);

  const balance = await this.web3Instance.eth.call({
    from: address,
    to: erc20Address,
    data: contract.methods.balanceOf(address).encodeABI()    
  });

  return web3Utils.hexToNumberString(balance);
}

/** @internal */
export async function getRootchainETHBalance (
  address: string
): Promise<string> {
  return this.web3Instance.eth.getBalance(address);
}

export interface IWaitForRootchainTransaction {
  transactionHash: string;
  checkIntervalMs: number;
  blocksToWait: number;
  onCountdown: (blocksRemaining: number) => void;
}

/** @internal */
export async function waitForRootchainTransaction ({
  transactionHash,
  checkIntervalMs,
  blocksToWait,
  onCountdown
}: IWaitForRootchainTransaction): Promise<Interfaces.ITransactionReceipt> {
  let remaining;

  const transactionReceiptAsync = async (transactionHash, resolve, reject) => {
    try {
      const transactionReceipt = await this.web3Instance.eth.getTransactionReceipt(transactionHash);
      if (blocksToWait > 0) {
        try {
          const block = await this.web3Instance.eth.getBlock(transactionReceipt.blockNumber);
          const current = await this.web3Instance.eth.getBlock('latest');
          const remainingCandidate = blocksToWait - (current.number - block.number);
          if (remainingCandidate !== remaining) {
            remaining = remainingCandidate;
            if (onCountdown) {
              onCountdown(remaining);
            }
          }
          if (current.number - block.number >= blocksToWait) {
            const transaction = await this.web3Instance.eth.getTransaction(transactionHash);
            if (transaction.blockNumber !== null) {
              return resolve(transactionReceipt);
            } else {
              return reject(new Error('Transaction with hash: ' + transactionHash + ' ended up in an uncle block.'));
            }
          } else {
            setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), checkIntervalMs);
          }
        } catch (e) {
          setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), checkIntervalMs);
        }
      } else {
        return resolve(transactionReceipt);
      }
    } catch (e) {
      return reject(e);
    }
  };

  return new Promise((resolve, reject) => transactionReceiptAsync(transactionHash, resolve, reject));
}

export interface IWaitForChildchainBalance {
  address: string;
  expectedAmount: Interfaces.IComplexAmount;
  currency: string;
}

/** @internal */
export async function waitForChildchainBalance ({
  address,
  expectedAmount,
  currency
}: IWaitForChildchainBalance): Promise<Array<WatcherAccountModule.IBalance>> {
  return promiseRetry(async retry => {
    const resp = await this.getBalance(address);
    if (resp.length === 0) retry();

    const currencyExists = resp.find(item => item.currency.toLowerCase() === currency.toLowerCase());
    if (!currencyExists) retry();

    const expectedBn = new BN(expectedAmount.toString());
    const isEqual = new BN(currencyExists.amount.toString()).eq(expectedBn);
    if (!isEqual) retry();

    return resp;
  }, {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  });
}

export interface IWaitForUtxo {
  address: string;
  oindex: number;
  txindex: number;
  blknum: number;
}

/** @internal */
export async function waitForUtxo ({
  address,
  oindex,
  txindex,
  blknum
}: IWaitForUtxo): Promise<Interfaces.IUTXO> {
  return promiseRetry(async retry => {
    const utxos: Array<Interfaces.IUTXO> = await WatcherAccountModule.getUtxos.call(this, address);
    const found = utxos.find(
      u =>
        u.oindex === oindex &&
        u.txindex === txindex &&
        u.blknum === blknum
    );
    return found
      ? found
      : retry();
  },
  {
    minTimeout: 6000,
    factor: 1,
    retries: 50
  });
}

/** @internal */
export async function getMinimumExitPeriod (): Promise<string> {
  return this.plasmaContract.methods.minExitPeriod().call();
}
