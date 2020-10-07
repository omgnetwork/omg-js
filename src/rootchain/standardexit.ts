import BN from 'bn.js';
import abiDecoder from 'abi-decoder';
import { keccak256 } from 'ethereumjs-util';
import { Buffer } from 'buffer';

import * as ContractsModule from '@lib/contracts';
import * as TransactionsModule from '@lib/rootchain/transaction';
import * as Interfaces from '@lib/common/interfaces';
import * as Constants from '@lib/common/constants';
import * as Util from '@lib/common/util';
import MerkleTree from '@lib/common/merkle';

import EthVaultContract from '@lib/contracts/abi/EthVault.json';

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
  standardExitId: number | string | BN;
  exitingTx: string;
  challengeTx: string;
  inputIndex: number;
  challengeTxSig: string;
  transactionOptions: Interfaces.ITransactionOptions
}

export async function challengeStandardExit ({
  standardExitId,
  exitingTx,
  challengeTx,
  inputIndex,
  challengeTxSig,
  transactionOptions
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
      keccak256(Buffer.from(transactionOptions.from))
    ]
  );

  return TransactionsModule.sendTransaction.call(this, {
    from: transactionOptions.from,
    to: address,
    data: transactionData,
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
}

export interface IProcessExits {
  token: string;
  exitId: number | string;
  maxExitsToProcess: number;
  transactionOptions: Interfaces.ITransactionOptions
}

export async function processExits ({
  token,
  exitId,
  maxExitsToProcess,
  transactionOptions
}: IProcessExits): Promise<Interfaces.ITransactionReceipt> {
  const vaultId = token === Constants.CURRENCY_MAP.ETH ? 1 : 2;

  const transactionData = ContractsModule.getTxData(
    this.plasmaContract,
    'processExits',
    vaultId,
    token,
    exitId,
    maxExitsToProcess
  );

  return TransactionsModule.sendTransaction.call(this, {
    from: transactionOptions.from,
    to: this.plasmaContractAddress,
    data: transactionData,
    gasLimit: transactionOptions.gasLimit,
    gasPrice: transactionOptions.gasPrice,
    privateKey: transactionOptions.privateKey
  });
}
