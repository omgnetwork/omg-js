import { ITransactionReceipt, ITransactionDetails } from '@lib/common/interfaces';
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
