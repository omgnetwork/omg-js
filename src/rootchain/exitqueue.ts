import web3Utils from 'web3-utils';
import BN from 'bn.js';

import * as Constants from '@lib/common/constants';
import * as ContractsModule from '@lib/contracts';
import * as Interfaces from '@lib/common/interfaces';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';

export interface IGetExitTime {
  exitRequestBlockNumber: string,
  submissionBlockNumber: string,
  retries?: number
}

export interface IExitTime {
  /** scheduled finalization unix time */
  scheduledFinalizationTime: number,
  /** milliseconds until the scheduled finalization time */
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
  /** exit priority */
  priority: string,
  /** scheduled finalization unix time */
  exitableAt: string,
  /** the unique exit id */
  exitId: string
}

/** @internal */
export async function getExitQueue (
  token: string = Constants.CURRENCY_MAP.ETH
): Promise<IExitQueue[]> {
  const vaultId = token === Constants.CURRENCY_MAP.ETH ? 1 : 2;
  const hashed = web3Utils.soliditySha3(
    { t: 'uint256', v: vaultId },
    { t: 'address', v: token }
  );
  const address: string = await this.plasmaContract.methods.exitsQueues(hashed).call();
  const { contract } = await ContractsModule.getPriorityQueue.call(this, address);
  const rawExitQueue: Array<string> = await contract.methods.heapList().call();

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
  token: string;
  exitId: number | string;
  maxExitsToProcess: number;
  txOptions: Interfaces.ITransactionOptions
}

/** @internal */
export async function processExits ({
  token,
  exitId,
  maxExitsToProcess,
  txOptions
}: IProcessExits): Promise<Interfaces.ITransactionReceipt> {
  const vaultId = token === Constants.CURRENCY_MAP.ETH ? 1 : 2;

  const transactionData = ContractsModule.getTxData(
    this.plasmaContract,
    'processExits',
    vaultId,
    token,
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
export async function hasExitQueue (token: string): Promise<boolean> {
  const vaultId = token === Constants.CURRENCY_MAP.ETH ? 1 : 2;
  return this.plasmaContract.methods.hasExitQueue(vaultId, token).call();
}

export interface IAddExitQueue {
  token: string;
  txOptions: Interfaces.ITransactionOptions;
}

/** @internal */
export async function addExitQueue ({
  token,
  txOptions
}: IAddExitQueue): Promise<Interfaces.ITransactionReceipt> {
  const vaultId = token === Constants.CURRENCY_MAP.ETH ? 1 : 2;

  const transactionData = ContractsModule.getTxData(
    this.plasmaContract,
    'addExitQueue',
    vaultId,
    token
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
