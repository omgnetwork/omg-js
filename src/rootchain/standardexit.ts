import BN from 'bn.js';
import abiDecoder from 'abi-decoder';
import { keccak256 } from 'ethereumjs-util';
import { Buffer } from 'buffer';

import * as ContractsModule from '@lib/contracts';
import * as RootchainTransactionsModule from '@lib/rootchain/transaction';
import * as Util from '@lib/common/util';
import * as Interfaces from '@lib/common/interfaces';
import MerkleTree from '@lib/common/merkle';

import EthVaultContract from '@lib/contracts/abi/EthVault.json';

export interface IGetStandardExitId {
  txBytes: string;
  utxoPos: Interfaces.IComplexAmount;
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
  utxoPos: Interfaces.IComplexAmount;
  outputTx: string;
  inclusionProof: string;
  txOptions: Interfaces.ITransactionOptions
};

export async function startStandardExit ({
  utxoPos,
  outputTx,
  inclusionProof,
  txOptions
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

export interface IGetDepositExitData {
  transactionHash: string;
};

export interface IExitData {
  proof: string;
  txbytes: string;
  utxo_pos: number
};

export async function getDepositExitData ({
  transactionHash
}: IGetDepositExitData): Promise<IExitData> {
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
  }
}

export interface IChallengeStandardExit {
  standardExitId: Interfaces.IComplexAmount;
  exitingTx: string;
  challengeTx: string;
  inputIndex: number;
  challengeTxSig: string;
  txOptions: Interfaces.ITransactionOptions
}

export async function challengeStandardExit ({
  standardExitId,
  exitingTx,
  challengeTx,
  inputIndex,
  challengeTxSig,
  txOptions
}: IChallengeStandardExit): Promise<Interfaces.ITransactionReceipt> {
  // standardExitId is an extremely large number as it uses the entire int192.
  // It's too big to be represented as a Number, so we convert it to a hex string
  const exitId = Util.int192toHex(standardExitId.toString());
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
