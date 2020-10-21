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

import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Constants from '@lib/common/constants';
import * as Encoders from '@lib/transaction/encoders';
import * as Interfaces from '@lib/interfaces';

/** @internal */
export async function approveERC20Deposit ({
  erc20Address,
  amount,
  txOptions
}: Interfaces.IApproveDeposit): Promise<Interfaces.ITransactionReceipt> {
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

/** @internal */
export async function deposit ({
  amount,
  currency = Constants.CURRENCY_MAP.ETH,
  txOptions
}: Interfaces.IDeposit): Promise<Interfaces.ITransactionReceipt> {
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
