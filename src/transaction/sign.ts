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

import { Buffer } from 'buffer';
import * as rlp from 'rlp';
import { concatSig } from 'eth-sig-util';
import { ecsign } from 'ethereumjs-util';

import * as Util from '@lib/common/util';
import * as Interfaces from '@lib/interfaces';
import * as TypedDataModule from '@lib/transaction/typedData';
import * as StructHashModule from '@lib/transaction/structHash';
import * as Encoders from '@lib/transaction/encoders';

/** @internal */
function _ecsign (tosign: Buffer, privateKey: string): string {
  const signed: any = ecsign(
    tosign,
    Buffer.from(privateKey.replace('0x', ''), 'hex')
  );
  return concatSig(signed.v, signed.r, signed.s);
}

/** @internal */
export function sign (tx: Buffer, privateKeys: Array<string>): Array<string> {
  return privateKeys.map(key => _ecsign(tx, key));
}

/** @internal */
export function signTypedData ({
  txData,
  privateKeys
}: Interfaces.ISignTypedData): TypedDataModule.ISignedTypedData {
  const toSign = Buffer.from(txData.sign_hash.replace('0x', ''), 'hex');
  (txData.typed_data as TypedDataModule.ISignedTypedData).signatures = sign(toSign, privateKeys);
  return (txData.typed_data as TypedDataModule.ISignedTypedData);
}

/** @internal */
export function signTransaction ({
  typedData,
  privateKeys
}: Interfaces.ISignTransaction): Array<string> {
  const toSign = StructHashModule.hashTypedData(typedData);
  return sign(toSign, privateKeys);
}

/** @internal */
export function buildSignedTransaction ({
  typedData,
  signatures
}: Interfaces.IBuildSignedTransaction): string {
  const txArray = Encoders.getTypedDataArray(typedData.message);
  const signedTx = [signatures, typedData.message.txType, ...txArray];
  return Util.prefixHex(rlp.encode(signedTx).toString('hex'));
}
