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

import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/interfaces';

/** @internal */
const domainSpec: Array<Interfaces.ITypedDataSpec> = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' }
];

/** @internal */
const txSpec: Array<Interfaces.ITypedDataSpec> = [
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

/** @internal */
const inputSpec: Array<Interfaces.ITypedDataSpec> = [
  { name: 'blknum', type: 'uint256' },
  { name: 'txindex', type: 'uint256' },
  { name: 'oindex', type: 'uint256' }
];

/** @internal */
const outputSpec: Array<Interfaces.ITypedDataSpec> = [
  { name: 'outputType', type: 'uint256' },
  { name: 'outputGuard', type: 'bytes20' },
  { name: 'currency', type: 'address' },
  { name: 'amount', type: 'uint256' }
];

/** @internal */
const domainData: Interfaces.ITypedDataDomainData = {
  name: 'OMG Network',
  version: '1',
  verifyingContract: '',
  salt: '0xfad5c7f626d80f9256ef01929f3beb96e058b8b4b0e3fe52d84f054c0e2a7a83'
};

/** @internal */
export function getTypedData (
  transactionBody: Interfaces.ITransactionBody
): Interfaces.ITypedData {
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
  };
}
