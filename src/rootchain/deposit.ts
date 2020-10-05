import BN from 'bn.js';

import * as ContractsModule from 'contracts';
import { ITransactionOptions, ITransactionReceipt } from 'common/interfaces';

export interface IApproveDeposit {
  erc20Address: string;
  amount: string | number | BN;
  transactionOptions: ITransactionOptions
}

export async function approveDeposit ({
  erc20Address,
  amount,
  transactionOptions
}: IApproveDeposit): Promise<ITransactionReceipt> {
  const { address: spender } = await this.getErc20Vault();
  const { contract } = await ContractsModule.getErc20(erc20Address);
  const txDetails = {
    from: transactionOptions.from,
    to: erc20Address,
    data: contract.methods.approve(spender, amount.toString()).encodeABI(),
    gas: transactionOptions.gas,
    gasPrice: transactionOptions.gasPrice
  };
  return txUtils.sendTx({
    web3: this.web3,
    txDetails,
    privateKey: transactionOptions.privateKey
  });
}
