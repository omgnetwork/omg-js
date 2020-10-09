import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';

export interface ITypedDataSpec {
  name: string;
  type: string;
};

export interface ITypedDataTypes {
  EIP712Domain: Array<ITypedDataSpec>;
  Transaction: Array<ITypedDataSpec>;
  Input: Array<ITypedDataSpec>;
  Output: Array<ITypedDataSpec>;
}
export interface ITypedDataDomainData {
  name: string;
  version: string;
  verifyingContract: string;
  salt: string;
}

export interface ITypedDataMessage {
  txType: number
  input0: Partial<Interfaces.IUTXO>;
  input1: Partial<Interfaces.IUTXO>;
  input2: Partial<Interfaces.IUTXO>;
  input3: Partial<Interfaces.IUTXO>;
  output0: Interfaces.IOutput;
  output1: Interfaces.IOutput;
  output2: Interfaces.IOutput;
  output3: Interfaces.IOutput;
  txData: number;
  metadata: string;
};

export interface ITypedData {
  types: ITypedDataTypes;
  domain: ITypedDataDomainData;
  primaryType: string;
  message: ITypedDataMessage;
};

const domainSpec: Array<ITypedDataSpec> = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' }
];

const txSpec: Array<ITypedDataSpec> = [
  { name: 'txType', type: 'uint256' },
  { name: 'input0', type: 'Input' },
  { name: 'input1', type: 'Input' },
  { name: 'input2', type: 'Input' },
  { name: 'input3', type: 'Input' },
  { name: 'output0', type: 'Output' },
  { name: 'output1', type: 'Output' },
  { name: 'output2', type: 'Output' },
  { name: 'output3', type: 'Output' },
  { name: 'txData', type: 'uint256' },
  { name: 'metadata', type: 'bytes32' }
];

const inputSpec: Array<ITypedDataSpec> = [
  { name: 'blknum', type: 'uint256' },
  { name: 'txindex', type: 'uint256' },
  { name: 'oindex', type: 'uint256' }
];

const outputSpec: Array<ITypedDataSpec> = [
  { name: 'outputType', type: 'uint256' },
  { name: 'outputGuard', type: 'bytes20' },
  { name: 'currency', type: 'address' },
  { name: 'amount', type: 'uint256' }
];

const domainData: ITypedDataDomainData = {
  name: 'OMG Network',
  version: '1',
  verifyingContract: '',
  salt: '0xfad5c7f626d80f9256ef01929f3beb96e058b8b4b0e3fe52d84f054c0e2a7a83'
};

export function getTypedData (
  transactionBody: Interfaces.ITransactionBody
): ITypedData {
  domainData.verifyingContract = this.plasmaContractAddress;

  const inputs = transactionBody.inputs.map(i => ({
    blknum: i.blknum,
    txindex: i.txindex,
    oindex: i.oindex
  }));

  const outputs = transactionBody.outputs.map(o => ({
    outputType: o.outputType || 1,
    outputGuard: o.outputGuard || o.owner,
    currency: o.currency,
    amount: o.amount.toString()
  }));

  return {
    types: {
      EIP712Domain: domainSpec,
      Transaction: txSpec,
      Input: inputSpec,
      Output: outputSpec
    },
    domain: domainData,
    primaryType: 'Transaction',
    message: {
      txType: transactionBody.txType || 1,
      input0: inputs.length > 0 ? inputs[0] : Constants.NULL_INPUT,
      input1: inputs.length > 1 ? inputs[1] : Constants.NULL_INPUT,
      input2: inputs.length > 2 ? inputs[2] : Constants.NULL_INPUT,
      input3: inputs.length > 3 ? inputs[3] : Constants.NULL_INPUT,
      output0: outputs.length > 0 ? outputs[0] : Constants.NULL_OUTPUT,
      output1: outputs.length > 1 ? outputs[1] : Constants.NULL_OUTPUT,
      output2: outputs.length > 2 ? outputs[2] : Constants.NULL_OUTPUT,
      output3: outputs.length > 3 ? outputs[3] : Constants.NULL_OUTPUT,
      txData: transactionBody.txData || 0,
      metadata: transactionBody.metadata || Constants.NULL_METADATA
    }
  }
}
