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

import abiDecoder from 'abi-decoder';
import { keccak256 } from 'ethereumjs-util';

import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Util from '@lib/common/util';
import * as Interfaces from '@lib/interfaces';
import MerkleTree from '@lib/rootchain/merkle';

import EthVaultContract from '@lib/contracts/abi/EthVault.json';

/** @internal */
export async function getStandardExitId ({
  txBytes,
  utxoPos,
  isDeposit
}: Interfaces.IGetStandardExitId): Promise<string> {
  const { contract } = await this.getPaymentExitGame();
  return contract.methods
    .getStandardExitId(isDeposit, txBytes, utxoPos.toString())
    .call({ from: this.plasmaContractAddress });
}

/** @internal */
export async function startStandardExit ({
  utxoPos,
  outputTx,
  inclusionProof,
  txOptions
}: Interfaces.IStartStandardExit): Promise<Interfaces.ITransactionReceipt> {
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

  return RootchainTransactionsModule.sendTransaction.call(this, {
    from: txOptions.from,
    to: address,
    data: transactionData,
    value: bonds.standardExit,
    gasLimit: txOptions.gasLimit,
    gasPrice: txOptions.gasPrice,
    privateKey: txOptions.privateKey
  });
}

/** @internal */
export async function getDepositExitData (
  transactionHash: string
): Promise<Interfaces.IExitData> {
  // use a vault abi to decode the inputs and get the txbytes
  abiDecoder.addABI(EthVaultContract.abi);
  const rawTransaction = await this.web3Instance.eth.getTransaction(transactionHash);
  const decodedInputs = abiDecoder.decodeMethod(rawTransaction.input);
  const txbytes = decodedInputs.params[0].value;

  // create merkle tree and get the inclusion proof
  const txLeaf = this.web3Instance.utils.bytesToHex(txbytes);
  const merkleTree = new MerkleTree([txLeaf], 16);
  const proof = merkleTree.getInclusionProof(txLeaf);

  // blknum will be the 3rd topic in the first event
  const receipt = await this.web3Instance.eth.getTransactionReceipt(transactionHash);
  const blknum = this.web3Instance.utils.hexToNumber(receipt.logs[0].topics[2]);

  return {
    proof,
    txbytes,
    utxo_pos: blknum * 1000000000
  };
}

/** @internal */
export async function challengeStandardExit ({
  standardExitId,
  exitingTx,
  challengeTx,
  inputIndex,
  challengeTxSig,
  txOptions
}: Interfaces.IChallengeStandardExit): Promise<Interfaces.ITransactionReceipt> {
  // standardExitId is an extremely large number as it uses the entire int192.
  // It's too big to be represented as a Number, so we convert it to a hex string
  const exitId = Util.int192toHex(standardExitId);
  const { address, contract } = await this.getPaymentExitGame();

  const transactionData = ContractsModule.getTxData(
    contract,
    'challengeStandardExit',
    [
      exitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
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
