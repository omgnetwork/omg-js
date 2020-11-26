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

import { keccak256 } from 'ethereumjs-util';

import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Interfaces from '@lib/interfaces';

/** @internal */
export async function getInFlightExitId (
  txBytes: string
): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods
    .getInFlightExitId(txBytes)
    .call({ from: this.plasmaContractAddress });
}

/** @internal */
export async function getInFlightExitContractData (
  exitIds: Array<string>
): Promise<Array<Interfaces.IInFlightExitContractData>> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods
    .inFlightExits(exitIds)
    .call({ from: this.plasmaContractAddress });
}

/** @internal */
export async function startInFlightExit ({
  inFlightTx,
  inputTxs,
  inputUtxosPos,
  inputTxsInclusionProofs,
  inFlightTxSigs,
  txOptions
}: Interfaces.IStartInFlightExit): Promise<Interfaces.ITransactionReceipt> {
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
}

/** @internal */
export async function piggybackInFlightExitOnOutput ({
  inFlightTx,
  outputIndex,
  txOptions
}: Interfaces.IPiggybackInFlightExitOnOutput): Promise<Interfaces.ITransactionReceipt> {
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

/** @internal */
export async function piggybackInFlightExitOnInput ({
  inFlightTx,
  inputIndex,
  txOptions
}: Interfaces.IPiggybackInFlightExitOnInput): Promise<Interfaces.ITransactionReceipt> {
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
}: Interfaces.IChallengeInFlightExitNotCanonical): Promise<Interfaces.ITransactionReceipt> {
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

/** @internal */
export async function respondToNonCanonicalChallenge ({
  inFlightTx,
  inFlightTxPos,
  inFlightTxInclusionProof,
  txOptions
}: Interfaces.IRespondToNonCanonicalChallenge): Promise<Interfaces.ITransactionReceipt> {
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
}: Interfaces.IChallengeInFlightExitInputSpent): Promise<Interfaces.ITransactionReceipt> {
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
      keccak256(txOptions.from)
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

/** @internal */
export async function challengeInFlightExitOutputSpent ({
  inFlightTx,
  inFlightTxInclusionProof,
  inFlightTxOutputPos,
  challengingTx,
  challengingTxInputIndex,
  challengingTxWitness,
  txOptions
}: Interfaces.IChallengeInFlightExitOutputSpent): Promise<Interfaces.ITransactionReceipt> {
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
      keccak256(txOptions.from)
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

/** @internal */
export async function deleteNonPiggybackedInFlightExit ({
  exitId,
  txOptions
}: Interfaces.IDeleteNonPiggybackedInFlightExit): Promise<Interfaces.ITransactionReceipt> {
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
