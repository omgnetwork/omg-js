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

import * as Util from '@lib/common/util';
import * as Interfaces from '@lib/common/interfaces';

/** @internal */
export async function sendTransaction (
  transactionDetails: Interfaces.ITransactionDetails
): Promise<Interfaces.ITransactionReceipt> {
  const _gasLimit: number = await setGasLimit.call(this, transactionDetails);
  const _gasPrice: string = await setGasPrice.call(this, transactionDetails.gasPrice);

  const enhancedTransactionDetails: Interfaces.ITransactionDetails = {
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
}

/** @internal */
export async function setGasLimit (
  transactionDetails: Interfaces.ITransactionDetails
): Promise<number> {
  if (transactionDetails.gasLimit) {
    return transactionDetails.gasLimit;
  }
  const gasLimitEstimation = await this.web3Instance.eth.estimateGas(transactionDetails);
  return gasLimitEstimation;
}

/** @internal */
export async function setGasPrice (
  gasPrice: string
): Promise<string> {
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
}
