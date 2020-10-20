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

import { assert } from 'chai';
import * as rlp from 'rlp';

import * as Interfaces from '@lib/common/interfaces';
import * as Constants from '@lib/common/constants';
import * as Encoders from '@lib/transaction/encoders';
import * as TypedData from '@lib/transaction/typedData';
import * as StructHash from '@lib/transaction/structHash';
import * as Sign from '@lib/transaction/sign';

describe('transaction/encoders test', function () {
  describe('Decode transaction tests', function () {
    it('should decode an encoded unsigned transaction with inputs and outputs', async function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 12
          },
          {
            txindex: 4579,
            oindex: 13,
            blknum: 9821314
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            amount: '1'
          },
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: '4567'
          },
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: '89008900'
          },
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: '1234567890123456'
          }
        ],
        txData: 0,
        metadata: Constants.NULL_METADATA
      };
  
      const encodedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const decoded = Encoders.decodeTransaction(encodedTx);
      assert.isUndefined(decoded.sigs);
      assert.deepEqual(txBody as Interfaces.ITransactionBody, decoded);
    });
  
    it('should decode an encoded unsigned transaction with only inputs', async function () {
      const txBody = {
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 12
          },
          {
            txindex: 4579,
            oindex: 13,
            blknum: 9821314
          }
        ],
        outputs: [],
        metadata: Constants.NULL_METADATA
      };
  
      const encodedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const decoded = Encoders.decodeTransaction(encodedTx);
      assert(decoded.inputs);
      assert(decoded.outputs);
      assert.isUndefined(decoded.sigs);
      txBody.inputs.forEach(input => assert.deepInclude(decoded.inputs, input));
      decoded.outputs.forEach(output => {
        assert.deepEqual(output, {
          amount: 0,
          owner: '0x0000000000000000000000000000000000000000',
          currency: Constants.CURRENCY_MAP.ETH
        });
      });
    });
  
    it('should decode an encoded signed transaction with only inputs', async function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 12
          },
          {
            txindex: 4579,
            oindex: 13,
            blknum: 9821314
          }
        ],
        outputs: [],
        txData: 0,
        metadata: Constants.NULL_METADATA
      };
      const key = 'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f';
      const plasmaContractAddress = '0xa1d683a00f63dda0cde68349ebfd38513d79433f';
      const typedData = TypedData.getTypedData.call({ plasmaContractAddress }, txBody);
      const toSign = StructHash.hashTypedData(typedData);
      const signatures = Sign.sign(toSign, [key, key]);
      const toEndcode = [
        signatures,
        typedData.message.txType,
        ...Encoders.getTypedDataArray(typedData.message)
      ];
      const signedEncoded = rlp.encode(toEndcode);
  
      const decoded = Encoders.decodeTransaction(signedEncoded);
      assert.containsAllKeys(decoded, [
        'sigs',
        'inputs',
        'outputs',
        'txType',
        'txData',
        'metadata'
      ]);
      assert.deepEqual(
        { ...txBody, sigs: signatures } as Interfaces.ITransactionBody,
        decoded
      );
    });
  
    it('should decode an encoded signed transaction with inputs and outputs', async function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 12
          },
          {
            txindex: 4579,
            oindex: 13,
            blknum: 9821314
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            amount: '1'
          },
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: '4567'
          }
        ],
        txData: 0,
        metadata: Constants.NULL_METADATA
      };
      const key = 'ea54bdc52d163f88c93ab0615782cf718a2efb9e51a7989aab1b08067e9c1c5f';
      const plasmaContractAddress = '0xa1d683a00f63dda0cde68349ebfd38513d79433f';
      const typedData = TypedData.getTypedData.call({ plasmaContractAddress }, txBody);
      const toSign = StructHash.hashTypedData(typedData);
      const signatures = Sign.sign(toSign, [key, key]);
      const toEndcode = [
        signatures,
        typedData.message.txType,
        ...Encoders.getTypedDataArray(typedData.message)
      ];
      const signedEncoded = rlp.encode(toEndcode);
  
      const decoded = Encoders.decodeTransaction(signedEncoded);
      assert.containsAllKeys(decoded, [
        'sigs',
        'inputs',
        'outputs',
        'txType',
        'txData',
        'metadata'
      ]);
      assert.deepEqual(
        { ...txBody, sigs: signatures } as Interfaces.ITransactionBody,
        decoded
      );
    });
  
    it('should decode encoded deposit to raw', async function () {
      const owner = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const amount = '10';
      const currency = '0x0000000000000000000000000000000000000000';
  
      const encodedDeposit = Encoders.encodeDeposit({ owner, amount, currency });
      const decoded = Encoders.decodeTransaction(encodedDeposit);
      assert.deepEqual(
        {
          txType: 1,
          inputs: [],
          outputs: [
            {
              outputType: 1,
              amount: '10',
              outputGuard: owner,
              currency
            }
          ],
          txData: 0,
          metadata:
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        },
        decoded
      );
    });
  
    it('should decode encoded deposit', async function () {
      const owner = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const amount = '10';
      const currency = '0x0000000000000000000000000000000000000000';
      const encodedTx = Encoders.encodeDeposit({ owner, amount, currency });
      const decoded = Encoders.decodeDeposit(encodedTx);
      assert.deepEqual(decoded, {
        owner,
        amount,
        currency
      });
    });
  });
});
