import BN from 'bn.js';

import * as ContractsModule from '@lib/contracts';
import * as TransactionsModule from '@lib/rootchain/transaction';
import * as Constants from '@lib/common/constants';
import * as Util from '@lib/common/util';
import * as Interfaces from '@lib/common/interfaces';

export interface IApproveDeposit {
  erc20Address: string;
  amount: string | number | BN;
  transactionOptions: Interfaces.ITransactionOptions
}

export async function approveERC20Deposit ({
  erc20Address,
  amount,
  transactionOptions
}: IApproveDeposit): Promise<Interfaces.ITransactionReceipt> {
  const { address: spender } = await this.getErc20Vault();
  const { contract } = await ContractsModule.getErc20.call(this, erc20Address);

  return TransactionsModule.sendTransaction.call(this, {
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
  transactionOptions: Interfaces.ITransactionOptions;
}

export async function deposit ({
  amount,
  currency = Constants.CURRENCY_MAP.ETH,
  transactionOptions
}: IDeposit): Promise<Interfaces.ITransactionReceipt> {
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

  const transactionData = ContractsModule.getTxData(
    contract,
    'deposit',
    depositTx
  );

  return TransactionsModule.sendTransaction.call(this, {
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
      outputGuard: Util.prefixHex(owner),
      currency: Util.prefixHex(currency),
      amount
    }],
    txData: 0,
    metadata: Constants.NULL_METADATA
  });
}
