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
import { Contract } from 'web3-eth-contract';
import BN from 'bn.js';

import * as Constants from '@lib/common/constants';
import * as ContractsModule from '@lib/contracts';
import * as Interfaces from '@lib/common/interfaces';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';

export interface IGetExitTime {
  exitRequestBlockNumber: Interfaces.IComplexAmount,
  submissionBlockNumber: Interfaces.IComplexAmount,
  retries?: number
}

export interface IExitTime {
  scheduledFinalizationTime: number,
  msUntilFinalization: number
}

/** @internal */
export async function getExitTime ({
  exitRequestBlockNumber,
  submissionBlockNumber,
  retries = 10
}: IGetExitTime): Promise<IExitTime> {
  const _exitRequestBlockNumber = exitRequestBlockNumber.toString();
  const _submissionBlockNumber = submissionBlockNumber.toString();

  const bufferSeconds = 5;
  const retryInterval = 5000;

  const _minExitPeriodSeconds = await this.plasmaContract.methods.minExitPeriod().call();
  const minExitPeriodSeconds = Number(_minExitPeriodSeconds);

  const exitBlock = await this.web3Instance.eth.getBlock(_exitRequestBlockNumber);
  if (!exitBlock) {
    if (retries > 0) {
      setTimeout(() => {
        return getExitTime({
          exitRequestBlockNumber: _exitRequestBlockNumber,
          submissionBlockNumber: _submissionBlockNumber,
          retries: retries - 1
        })
      }, retryInterval);
    } else {
      throw Error(`Could not get exit request block data: ${_exitRequestBlockNumber}`);
    }
  }

  const submissionBlock = await this.plasmaContract.methods.blocks(_submissionBlockNumber).call();

  let scheduledFinalizationTime: number;
  if (Number(_submissionBlockNumber) % 1000 !== 0) {
    // if deposit, elevated exit priority
    scheduledFinalizationTime = Math.max(
      Number(exitBlock.timestamp) + minExitPeriodSeconds,
      Number(submissionBlock.timestamp) + minExitPeriodSeconds
    );
  } else {
    scheduledFinalizationTime = Math.max(
      Number(exitBlock.timestamp) + minExitPeriodSeconds,
      Number(submissionBlock.timestamp) + (minExitPeriodSeconds * 2)
    );
  }

  const currentUnix: number = Math.round((new Date()).getTime() / 1000);
  const msUntilFinalization: number = (scheduledFinalizationTime + bufferSeconds - currentUnix) * 1000;
  return {
    scheduledFinalizationTime: scheduledFinalizationTime + bufferSeconds,
    msUntilFinalization
  }
};

export interface IExitQueue {
  priority: string,
  exitableAt: string,
  exitId: string
}

/** @internal */
export async function getExitQueue (
  currency: string = Constants.CURRENCY_MAP.ETH
): Promise<IExitQueue[]> {
  const vaultId = currency === Constants.CURRENCY_MAP.ETH ? 1 : 2;
  const hashed = web3Utils.soliditySha3(
    { t: 'uint256', v: vaultId },
    { t: 'address', v: currency }
  );

  let address: string;
  let contract: Contract;
  let rawExitQueue: Array<string>;
  try {
    // if no queue exists, this will throw so we early return an empty queue
    address = await this.plasmaContract.methods.exitsQueues(hashed).call();
    const priorityVault = await ContractsModule.getPriorityQueue.call(this, address);
    contract = priorityVault.contract;
    rawExitQueue = await contract.methods.heapList().call();
  } catch (error) {
    return [];
  }

  if (rawExitQueue && rawExitQueue.length) {
    // remove the first element since it is always 0 (because heap lists start from index 1)
    const exitQueuePriorities = rawExitQueue.slice(1);
    const exitQueue = exitQueuePriorities.map(_priority => {
      const priority = _priority.toString();
      const asBN = new BN(priority);
      // turn the uint256 priority into binary
      const binary = asBN.toString(2, 256);

      // split the bits into their necessary data
      // https://github.com/omisego/plasma-contracts/blob/master/plasma_framework/contracts/src/framework/utils/ExitPriority.sol#L16
      const exitableAtBinary = binary.substr(0, 42);
      const exitIdBinary = binary.substr(96, 160);

      // use BN to turn binary back into the format we want
      const exitableAt = new BN(exitableAtBinary, 2);
      const exitId = new BN(exitIdBinary, 2);

      return {
        priority,
        exitableAt: exitableAt.toString(),
        exitId: exitId.toString()
      }
    });
    return exitQueue;
  } else {
    return [];
  }
}

export interface IProcessExits {
  currency: string;
  exitId: number | string;
  maxExitsToProcess: number;
  txOptions: Interfaces.ITransactionOptions
}

/** @internal */
export async function processExits ({
  currency,
  exitId,
  maxExitsToProcess,
  txOptions
}: IProcessExits): Promise<Interfaces.ITransactionReceipt> {
  const vaultId = currency === Constants.CURRENCY_MAP.ETH ? 1 : 2;

  const transactionData = ContractsModule.getTxData(
    this.plasmaContract,
    'processExits',
    vaultId,
    currency,
    exitId,
    maxExitsToProcess
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: this.plasmaContractAddress,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

/** @internal */
export async function hasExitQueue (currency: string): Promise<boolean> {
  const vaultId = currency === Constants.CURRENCY_MAP.ETH ? 1 : 2;
  return this.plasmaContract.methods.hasExitQueue(vaultId, currency).call();
}

export interface IAddExitQueue {
  currency: string;
  txOptions: Interfaces.ITransactionOptions;
}

/** @internal */
export async function addExitQueue ({
  currency,
  txOptions
}: IAddExitQueue): Promise<Interfaces.ITransactionReceipt> {
  const vaultId = currency === Constants.CURRENCY_MAP.ETH ? 1 : 2;

  const transactionData = ContractsModule.getTxData(
    this.plasmaContract,
    'addExitQueue',
    vaultId,
    currency
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: this.plasmaContractAddress,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}
