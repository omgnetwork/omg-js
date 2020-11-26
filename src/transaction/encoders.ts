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
import web3Utils from 'web3-utils';
import * as rlp from 'rlp';
import { Buffer } from 'buffer';

import * as Util from '@lib/common/util';
import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/interfaces';

/** @internal */
export function encodeDeposit ({
  owner,
  amount,
  currency
}: Interfaces.IDepositTransaction): string {
  return encodeTransaction({
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

/** @internal */
export function decodeDeposit (encodedDeposit: string): Interfaces.IDepositTransaction {
  const { outputs } = decodeTransaction(encodedDeposit);
  const [{ outputGuard, amount, currency }] = outputs;
  return {
    owner: outputGuard,
    amount,
    currency
  };
}

/** @internal */
export function encodeTransaction ({
  txType,
  inputs,
  outputs,
  txData,
  metadata,
  signatures,
  signed = true
}: Interfaces.IEncodeTransaction): string {
  const txArray: Array<unknown> = [txType];
  signatures && signed && txArray.unshift(signatures);
  const inputArray = [];
  const outputArray = [];
  for (let i = 0; i < Constants.MAX_INPUTS; i++) {
    addInput(inputArray,
      i < inputs.length
        ? inputs[i]
        : Constants.NULL_INPUT);
  }
  txArray.push(inputArray);
  for (let i = 0; i < Constants.MAX_OUTPUTS; i++) {
    addOutput(outputArray,
      i < outputs.length
        ? outputs[i]
        : Constants.NULL_OUTPUT);
  }
  txArray.push(outputArray);
  txArray.push(txData);
  txArray.push(metadata);

  const encoded = rlp.encode(txArray as rlp.Input).toString('hex');
  return Util.prefixHex(encoded);
}

/** @internal */
export function decodeTransaction (transaction: string | Buffer): Interfaces.ITransactionBody {
  let txType, inputs, outputs, txData, metadata, sigs;
  const rawTx = Buffer.isBuffer(transaction)
    ? transaction
    : Buffer.from(transaction.replace('0x', ''), 'hex');

  const decoded = rlp.decode(rawTx);
  switch (decoded.length) {
    case 5:
      [txType, inputs, outputs, txData, metadata] = decoded;
      break;
    case 6:
      [sigs, txType, inputs, outputs, txData, metadata] = decoded;
      break;
    default:
      throw new Error(`error decoding txBytes, got ${decoded}`);
  }

  return {
    ...(sigs && { sigs: sigs.map(parseString) }),
    txType: parseNumber(txType),
    inputs: inputs.map(input => decodeUtxoPos(parseString(input))),
    outputs: outputs.map(output => {
      const outputData = output[1];
      return {
        outputType: parseNumber(output[0]),
        outputGuard: parseString(outputData[0]),
        currency: parseString(outputData[1]),
        amount: web3Utils.toBN(parseString(outputData[2])).toString()
      };
    }),
    txData: parseNumber(txData),
    metadata: parseString(metadata)
  };
}

/** @internal */
export function encodeUtxoPos (utxo: Interfaces.IEncodeUtxoPos): BN {
  const blk = new BN(utxo.blknum.toString()).mul(new BN(Constants.BLOCK_OFFSET.toString()));
  const tx = new BN(utxo.txindex.toString()).muln(Constants.TX_OFFSET);
  return blk.add(tx).addn(utxo.oindex);
}

/** @internal */
export function decodeUtxoPos (utxoPos: Interfaces.IComplexAmount): Partial<Interfaces.IUTXO> {
  const bn = web3Utils.toBN(utxoPos.toString());
  const blknum = bn.div(new BN(Constants.BLOCK_OFFSET.toString())).toNumber();
  const txindex = bn.mod(new BN(Constants.BLOCK_OFFSET.toString())).divn(Constants.TX_OFFSET).toNumber();
  const oindex = bn.modn(Constants.TX_OFFSET);
  return { blknum, txindex, oindex };
}

/** @internal */
export function encodeMetadata (metadata: string): string {
  if (metadata.startsWith('0x')) {
    return metadata;
  }
  const encodedMetadata = Buffer.from(metadata).toString('hex').padStart(64, '0');
  return `0x${encodedMetadata}`;
}

/** @internal */
export function decodeMetadata (metadata: string): string {
  const unpad = metadata.replace('0x', '').replace(/^0*/, '');
  return Buffer.from(unpad, 'hex').toString();
}

/** @internal */
export function getTypedDataArray (typedDataMessage: Interfaces.ITypedDataMessage): Array<unknown> {
  const txArray = [];

  const inputArray = [];
  addInput(inputArray, typedDataMessage.input0);
  addInput(inputArray, typedDataMessage.input1);
  addInput(inputArray, typedDataMessage.input2);
  addInput(inputArray, typedDataMessage.input3);
  txArray.push(inputArray);

  const outputArray = [];
  addOutput(outputArray, typedDataMessage.output0);
  addOutput(outputArray, typedDataMessage.output1);
  addOutput(outputArray, typedDataMessage.output2);
  addOutput(outputArray, typedDataMessage.output3);
  txArray.push(outputArray);

  txArray.push(typedDataMessage.txData);
  txArray.push(typedDataMessage.metadata);

  return txArray;
}

/** @internal */
function addInput (array: Array<unknown>, input: Partial<Interfaces.IUTXO>): void {
  if (input.blknum !== 0) {
    const blk = new BN(input.blknum.toString()).mul(new BN(Constants.BLOCK_OFFSET));
    const tx = new BN(input.txindex.toString()).muln(Constants.TX_OFFSET);
    const position = blk.add(tx).addn(input.oindex).toArrayLike(Buffer);
    const toPad = 32 - position.length;
    const pads = Buffer.alloc(toPad, 0);
    const encodedPosition = Buffer.concat([pads, position]);
    array.push(encodedPosition);
  }
}

/** @internal */
function addOutput (array: Array<unknown>, output: Interfaces.IOutput): void {
  if (output.amount > 0) {
    array.push([
      output.outputType,
      [
        Util.prefixHex(output.outputGuard),
        Util.prefixHex(output.currency),
        new BN(output.amount.toString())
      ]
    ]);
  }
}

/** @internal */
function parseNumber (buf: Buffer): number {
  return buf.length === 0
    ? 0
    : parseInt(buf.toString('hex'), 16);
}

/** @internal */
function parseString (buf: Buffer): string {
  return buf.length === 0
    ? Constants.NULL_ADDRESS
    : `0x${buf.toString('hex')}`;
}
