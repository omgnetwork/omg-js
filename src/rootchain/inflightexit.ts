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

import BN from 'bn.js';
import { keccak256 } from 'ethereumjs-util';
import { Buffer } from 'buffer';

import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Interfaces from '@lib/common/interfaces';

/** @internal */
export async function getInFlightExitId (
  txBytes: string
): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.getInFlightExitId(txBytes).call();
};

export interface IInFlightExitInputOutput {
  outputId: string;
  exitTarget: string;
  token: string;
  amount: string;
  piggybackBondSize: string;
}

export interface IInFlightExitContractData {
  isCanonical: boolean;
  exitStartTimestamp: string;
  exitMap: string;
  position: string;
  inputs: Array<IInFlightExitInputOutput>;
  outputs: Array<IInFlightExitInputOutput>;
  bondOwner: string;
  bondSize: string;
  oldestCompetitorPosition: string;
}

/** @internal */
export async function getInFlightExitContractData (
  exitIds: Array<string>
): Promise<Array<IInFlightExitContractData>> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods.inFlightExits(exitIds).call();
};

export interface IStartInFlightExit {
  inFlightTx: string;
  inputTxs: Array<any>;
  inputUtxosPos: Array<Interfaces.IComplexAmount>;
  inputTxsInclusionProofs: Array<string>;
  inFlightTxSigs: Array<string>;
  txOptions: Interfaces.ITransactionOptions
};

/** @internal */
export async function startInFlightExit ({
  inFlightTx,
  inputTxs,
  inputUtxosPos,
  inputTxsInclusionProofs,
  inFlightTxSigs,
  txOptions
}: IStartInFlightExit): Promise<Interfaces.ITransactionReceipt> {
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

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    value: bonds.inflightExit,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
};

export interface IPiggybackInFlightExitOnOutput {
  inFlightTx: string;
  outputIndex: number;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function piggybackInFlightExitOnOutput ({
  inFlightTx,
  outputIndex,
  txOptions
}: IPiggybackInFlightExitOnOutput): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract, bonds } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'piggybackInFlightExitOnOutput',
    [
      inFlightTx,
      outputIndex
    ]
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    value: bonds.piggyback,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IPiggybackInFlightExitOnInput {
  inFlightTx: string;
  inputIndex: number;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function piggybackInFlightExitOnInput ({
  inFlightTx,
  inputIndex,
  txOptions
}: IPiggybackInFlightExitOnInput): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract, bonds } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'piggybackInFlightExitOnInput',
    [
      inFlightTx,
      inputIndex
    ]
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    value: bonds.piggyback,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IChallengeInFlightExitNotCanonical {
  inputTx: string;
  inputUtxoPos: Interfaces.IComplexAmount;
  inFlightTx: string;
  inFlightTxInputIndex: number;
  competingTx: string;
  competingTxInputIndex: number;
  competingTxPos: Interfaces.IComplexAmount;
  competingTxInclusionProof: string;
  competingTxWitness: string;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function challengeInFlightExitNotCanonical ({
  inputTx,
  inputUtxoPos,
  inFlightTx,
  inFlightTxInputIndex,
  competingTx,
  competingTxInputIndex,
  competingTxPos,
  competingTxInclusionProof,
  competingTxWitness,
  txOptions
}: IChallengeInFlightExitNotCanonical): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'challengeInFlightExitNotCanonical',
    [
      inputTx,
      inputUtxoPos.toString(),
      inFlightTx,
      inFlightTxInputIndex,
      competingTx,
      competingTxInputIndex,
      competingTxPos.toString(),
      competingTxInclusionProof,
      competingTxWitness
    ]
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IRespondToNonCanonicalChallenge {
  inFlightTx: string;
  inFlightTxPos: Interfaces.IComplexAmount;
  inFlightTxInclusionProof: string;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function respondToNonCanonicalChallenge ({
  inFlightTx,
  inFlightTxPos,
  inFlightTxInclusionProof,
  txOptions
}: IRespondToNonCanonicalChallenge): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'respondToNonCanonicalChallenge',
    inFlightTx,
    inFlightTxPos.toString(),
    inFlightTxInclusionProof
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IChallengeInFlightExitInputSpent {
  inFlightTx: string;
  inFlightTxInputIndex: number;
  challengingTx: string;
  challengingTxInputIndex: number;
  challengingTxWitness: string;
  inputTx: string;
  inputUtxoPos: Interfaces.IComplexAmount;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function challengeInFlightExitInputSpent ({
  inFlightTx,
  inFlightTxInputIndex,
  challengingTx,
  challengingTxInputIndex,
  challengingTxWitness,
  inputTx,
  inputUtxoPos,
  txOptions
}: IChallengeInFlightExitInputSpent): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'challengeInFlightExitInputSpent',
    [
      inFlightTx,
      inFlightTxInputIndex,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      inputTx,
      inputUtxoPos.toString(),
      keccak256(Buffer.from(txOptions.from))
    ]
  )
  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IChallengeInFlightExitOutputSpent {
  inFlightTx: string;
  inFlightTxInclusionProof: string;
  inFlightTxOutputPos: Interfaces.IComplexAmount;
  challengingTx: string;
  challengingTxInputIndex: number;
  challengingTxWitness: string;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function challengeInFlightExitOutputSpent ({
  inFlightTx,
  inFlightTxInclusionProof,
  inFlightTxOutputPos,
  challengingTx,
  challengingTxInputIndex,
  challengingTxWitness,
  txOptions
}: IChallengeInFlightExitOutputSpent): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'challengeInFlightExitOutputSpent',
    [
      inFlightTx,
      inFlightTxInclusionProof,
      inFlightTxOutputPos.toString(),
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      keccak256(Buffer.from(txOptions.from))
    ]
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

export interface IDeleteNonPiggybackedInFlightExit {
  exitId: string;
  txOptions: Interfaces.ITransactionOptions;
};

/** @internal */
export async function deleteNonPiggybackedInFlightExit ({
  exitId,
  txOptions
}: IDeleteNonPiggybackedInFlightExit): Promise<Interfaces.ITransactionReceipt> {
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'deleteNonPiggybackedInFlightExit',
    exitId
  );

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}
