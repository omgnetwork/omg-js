import web3Utils from 'web3-utils';
import promiseRetry from 'promise-retry';
import BN from 'bn.js';

import * as Interfaces from '@lib/common/interfaces';
import * as Util from '@lib/common/util';
import * as ContractsModule from '@lib/contracts';

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
};

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

export interface IWaitForRootchainTransaction {
  transactionHash: string;
  checkIntervalMs: number;
  blocksToWait: number;
  onCountdown: (blocksRemaining: number) => void;
};

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
  }

  return new Promise((resolve, reject) => transactionReceiptAsync(transactionHash, resolve, reject));
}

export interface IWaitForChildchainBalance {
  address: string;
  expectedAmount: Interfaces.IComplexAmount;
  currency: string;
}

export async function waitForChildchainBalance ({
  address,
  expectedAmount,
  currency
}: IWaitForChildchainBalance): Promise<Array<Interfaces.IBalance>> {
  return promiseRetry(async (retry, number) => {
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
