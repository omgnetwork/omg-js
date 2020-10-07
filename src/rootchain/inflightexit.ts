import BN from 'bn.js';

import * as ContractsModule from '@lib/contracts';
import * as TransactionsModule from '@lib/rootchain/transaction';
import * as Interfaces from '@lib/common/interfaces';

export interface IGetInflightExitId {
  txBytes: string;
};

export async function getInFlightExitId ({
  txBytes
}: IGetInflightExitId): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.getInFlightExitId(txBytes).call();
};

export interface IGetInflightExitData {
  exitIds: Array<string>;
};

// NMTODO: define this interface
export interface IInflightExitData {};

export async function getInFlightExitData ({
  exitIds
}: IGetInflightExitData): Promise<IInflightExitData> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.inFlightExits(exitIds).call();
};

export interface IStartInflightExit {
  inFlightTx: string;
  inputTxs: Array<any>;
  inputUtxosPos: Array<number | string | BN>;
  inputTxsInclusionProofs: Array<string>;
  inFlightTxSigs: Array<string>;
  transactionOptions: Interfaces.ITransactionOptions
};

export async function startInflightExit ({
  inFlightTx,
  inputTxs,
  inputUtxosPos,
  inputTxsInclusionProofs,
  inFlightTxSigs,
  transactionOptions
}: IStartInflightExit): Promise<Interfaces.ITransactionReceipt> {
  const _inputUtxoPos = inputUtxosPos.map(i => i.toString());
  const { address, contract, bonds } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'startInFlightExit',
    [
      inFlightTx,
      inputTxs,
      _inputUtxoPos,
      inputTxsInclusionProofs,
      inFlightTxSigs
    ]
  );

  return TransactionsModule.sendTransaction.call(this, {
    from: transactionOptions.from,
    to: address,
    data: transactionData,
    value: bonds.inflightExit,
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
};
