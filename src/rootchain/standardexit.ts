import BN from 'bn.js';

import * as ContractsModule from '@lib/contracts';
import * as TransactionsModule from '@lib/rootchain/transaction';
import * as Interfaces from '@lib/common/interfaces';

export interface IGetStandardExitId {
  txBytes: string;
  utxoPos: number | string | BN;
  isDeposit: boolean;
};

export async function getStandardExitId ({
  txBytes,
  utxoPos,
  isDeposit
}: IGetStandardExitId): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.getStandardExitId(isDeposit, txBytes, utxoPos.toString()).call();
};

export interface IStartStandardExit {
  utxoPos: number | string | BN;
  outputTx: string;
  inclusionProof: string;
  transactionOptions: Interfaces.ITransactionOptions
};

export async function startStandardExit ({
  utxoPos,
  outputTx,
  inclusionProof,
  transactionOptions
}: IStartStandardExit): Promise<Interfaces.ITransactionReceipt> {
  const { contract, address, bonds } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'startStandardExit',
    [
      utxoPos.toString(),
      outputTx,
      inclusionProof
    ]
  );

  return TransactionsModule.sendTransaction.call(this, {
    from: transactionOptions.from,
    to: address,
    data: transactionData,
    value: bonds.standardExit,
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
}
