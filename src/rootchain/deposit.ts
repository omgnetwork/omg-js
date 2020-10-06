import BN from 'bn.js';

import * as ContractsModule from 'contracts';
import * as Constants from 'common/constants';
import { ITransactionOptions, ITransactionReceipt } from 'common/interfaces';
import * as TransactionsModule from 'rootchain/transaction';

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

  return TransactionsModule.sendTransaction({
    from: transactionOptions.from,
    to: erc20Address,
    data: contract.methods.approve(spender, amount.toString()).encodeABI(),
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
}

export interface IDeposit {
  amount: string | number | BN;
  currency?: string;
  transactionOptions: ITransactionOptions;
}

export async function deposit ({
  amount,
  currency = Constants.CURRENCY_MAP.ETH,
  transactionOptions
}: IDeposit): Promise<ITransactionReceipt> {
  const _amount = amount.toString();
  const isEth = currency === Constants.CURRENCY_MAP.ETH;

  const { address, contract } = isEth
    ? await this.getEthVault()
    : await this.getErc20Vault();

  const depositTx = encodeDeposit({
    owner: transactionOptions.from,
    amount: _amount,
    currency
  });

  const transactionData = ContractsModule.getTxData(contract, 'deposit', depositTx);

  return TransactionsModule.sendTransaction({
    from: transactionOptions.from,
    to: address,
    ...isEth ? { value: _amount } : {},
    data: transactionData,
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
}

export interface IEncodeDeposit {
  owner: string,
  amount: string,
  currency: string
}

export function encodeDeposit ({
  owner,
  amount,
  currency
}: IEncodeDeposit): string {
  return TransactionsModule.encode({
    txType: 1,
    inputs: [],
    outputs: [{
      outputType: 1,
      outputGuard: TransactionsModule.prefixHex(owner),
      currency: TransactionsModule.prefixHex(currency),
      amount
    }],
    txData: 0,
    metadata: Constants.NULL_METADATA
  });
}
