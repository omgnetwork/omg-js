import BN from 'bn.js';
import * as rlp from 'rlp';
import { Buffer } from 'buffer';

import { ITransactionReceipt, ITransactionDetails } from '@lib/common/interfaces';
import * as Constants from '@lib/common/constants';
import * as Util from '@lib/common/util';

export async function sendTransaction (transactionDetails: ITransactionDetails): Promise<ITransactionReceipt> {
  const _gasLimit = await setGasLimit.call(this, transactionDetails);
  const _gasPrice = await setGasPrice.call(this, transactionDetails.gasPrice);

  const enhancedTransactionDetails: ITransactionDetails = {
    ...transactionDetails,
    gasLimit: _gasLimit,
    gasPrice: _gasPrice
  };

  if (!transactionDetails.privateKey) {
    return this.web3Instance.eth.sendTransaction(enhancedTransactionDetails);
  }

  if (transactionDetails.privateKey) {
    const signedTransaction = await this.web3Instance.eth.accounts.signTransaction(
      enhancedTransactionDetails,
      Util.prefixHex(transactionDetails.privateKey)
    );
    return this.web3Instance.eth.sendSignedTransaction(signedTransaction.rawTransaction);
  }
};

export async function setGasLimit (transactionDetails: ITransactionDetails): Promise<number> {
  if (transactionDetails.gasLimit) {
    return transactionDetails.gasLimit;
  }
  const gasLimitEstimation = await this.web3Instance.eth.estimateGas(transactionDetails);
  return gasLimitEstimation;
};

export async function setGasPrice (gasPrice: string): Promise<string> {
  if (gasPrice) {
    return gasPrice;
  }
  try {
    const currentGasPrice = await this.web3Instance.eth.getGasPrice();
    return currentGasPrice;
  } catch (error) {
    // default gas to 1 gwei
    return '1000000000';
  }
};

export interface IEncode {
  txType: number;
  inputs: Array<any>;
  outputs: Array<any>;
  txData: number;
  metadata: string;
  signatures?: Array<string>;
  signed?: boolean;
}

export function encode ({
  txType,
  inputs,
  outputs,
  txData,
  metadata,
  signatures,
  signed = true
}: IEncode): string {
  const txArray: Array<any> = [txType];
  signatures && signed && txArray.unshift(signatures);
  const inputArray = [];
  const outputArray = [];
  for (let i = 0; i < Constants.MAX_INPUTS; i++) {
    addInput(inputArray,
      i < inputs.length
        ? inputs[i]
        : Constants.NULL_INPUT)
  };
  txArray.push(inputArray);
  for (let i = 0; i < Constants.MAX_OUTPUTS; i++) {
    addOutput(outputArray,
      i < outputs.length
        ? outputs[i]
        : Constants.NULL_OUTPUT);
  };
  txArray.push(outputArray);
  txArray.push(txData);
  txArray.push(metadata);

  const encoded = rlp.encode(txArray).toString('hex');
  return Util.prefixHex(encoded);
};

function addInput (array: Array<any>, input): void {
  if (input.blknum !== 0) {
    const blk = new BN(input.blknum.toString()).mul(new BN(Constants.BLOCK_OFFSET));
    const tx = new BN(input.txindex.toString()).muln(Constants.TX_OFFSET);
    const position = blk.add(tx).addn(input.oindex).toArrayLike(Buffer);
    const toPad = 32 - position.length;
    const pads = Buffer.alloc(toPad, 0);
    const encodedPosition = Buffer.concat([pads, position]);
    array.push(encodedPosition);
  }
}

function addOutput (array: Array<any>, output): void {
  if (output.amount > 0) {
    array.push([
      output.outputType,
      [
        Util.prefixHex(output.outputGuard),
        Util.prefixHex(output.currency),
        new BN(output.amount.toString())
      ]
    ]);
  }
}
