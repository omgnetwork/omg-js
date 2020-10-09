import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';
import * as Encoders from '@lib/transaction/encoders';

export interface IApproveDeposit {
  erc20Address: string;
  amount: Interfaces.IComplexAmount;
  txOptions: Interfaces.ITransactionOptions
}

/** @internal */
export async function approveERC20Deposit ({
  erc20Address,
  amount,
  txOptions
}: IApproveDeposit): Promise<Interfaces.ITransactionReceipt> {
  const { address: spender } = await this.getErc20Vault();
  const { contract } = await ContractsModule.getErc20.call(this, erc20Address);

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: erc20Address,
    data: contract.methods.approve(spender, amount.toString()).encodeABI(),
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IDeposit {
  amount: Interfaces.IComplexAmount;
  currency?: string;
  txOptions: Interfaces.ITransactionOptions;
}

/** @internal */
export async function deposit ({
  amount,
  currency = Constants.CURRENCY_MAP.ETH,
  txOptions
}: IDeposit): Promise<Interfaces.ITransactionReceipt> {
  const _amount = amount.toString();
  const isEth = currency === Constants.CURRENCY_MAP.ETH;

  const { address, contract } = isEth
    ? await this.getEthVault()
    : await this.getErc20Vault();

  const depositTx = Encoders.encodeDeposit({
    owner: txOptions.from,
    amount: _amount,
    currency
  });

  const transactionData = ContractsModule.getTxData(
    contract,
    'deposit',
    depositTx
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    ...isEth ? { value: _amount } : {},
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}
