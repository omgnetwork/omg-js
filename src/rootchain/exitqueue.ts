import web3Utils from 'web3-utils';
import BN from 'bn.js';

import * as Constants from '@lib/common/constants';
import * as ContractsModule from '@lib/contracts';

export interface IGetExitTime {
  exitRequestBlockNumber: string,
  submissionBlockNumber: string,
  retries?: number
}

export interface IExitTime {
  scheduledFinalizationTime: number,
  msUntilFinalization: number
}

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

export async function getExitQueue (token: string): Promise<IExitQueue[]> {
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
