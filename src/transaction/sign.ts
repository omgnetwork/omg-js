import { Buffer } from 'buffer';
import * as rlp from 'rlp';
import { concatSig } from 'eth-sig-util';
import { ecsign } from 'ethereumjs-util';

import * as Util from '@lib/common/util';
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
export function sign (tx: Buffer, privateKeys: Array<string>) {
  return privateKeys.map(key => _ecsign(tx, key));
}

// NMTODO: figure out the txData interface
export interface ISignTypedData {
  txData: any;
  privateKeys: Array<string>;
};

/** @internal */
export function signTypedData ({
  txData,
  privateKeys
}: ISignTypedData): TypedDataModule.ITypedData {
  const toSign = Buffer.from(txData.sign_hash.replace('0x', ''), 'hex');
  txData.typed_data.signatures = sign(toSign, privateKeys);
  return txData.typed_data;
}

export interface ISignTransaction {
  typedData: TypedDataModule.ITypedData;
  privateKeys: Array<string>;
}

/** @internal */
export function signTransaction ({
  typedData,
  privateKeys
}: ISignTransaction): Array<string> {
  const toSign = StructHashModule.hashTypedData(typedData);
  return sign(toSign, privateKeys);
}

export interface IBuildSignedTransaction {
  typedData: TypedDataModule.ITypedData;
  signatures: Array<string>;
}

/** @internal */
export function buildSignedTransaction ({
  typedData,
  signatures
}: IBuildSignedTransaction): string {
  const txArray = Encoders.getTypedDataArray(typedData.message);
  const signedTx = [signatures, typedData.message.txType, ...txArray];
  return Util.prefixHex(rlp.encode(signedTx).toString('hex'));
}
