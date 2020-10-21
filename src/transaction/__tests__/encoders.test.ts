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

  describe('Encode metadata tests', function () {
    it('should encode/decode a string 1', function () {
      const str = '00100';
      return assert.equal(Encoders.decodeMetadata(Encoders.encodeMetadata(str)), str);
    });
    it('should encode/decode a string 2', function () {
      const str = 'The quick brown fox';
      return assert.equal(Encoders.decodeMetadata(Encoders.encodeMetadata(str)), str);
    });
    it('should encode/decode a string 3', function () {
      const str = 'Unicode ₿itcoin, さとし';
      return assert.equal(Encoders.decodeMetadata(Encoders.encodeMetadata(str)), str);
    });
  });

  describe('Encode transaction tests', function () {
    it('should return an encoded transaction from 1 input and 1 output', async function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 19774001
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 500000000000000123
          }
        ]
      };
      const unsignedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const expectedTx = '0xf85c01e1a0000000000000000000000000000000000000000000000000004640596164aa00f6f501f394f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b9400000000000000000000000000000000000000008806f05b59d3b200648080';
      assert.equal(unsignedTx, expectedTx);
    });
  
    it('should return an encoded transaction from bn amount', async function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 19774001
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: '123'
          }
        ]
      };
      const encodedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const decodedTx = Encoders.decodeTransaction(encodedTx);
  
      assert.deepEqual(
        {
          txType: 1,
          inputs: [
            {
              txindex: 0,
              oindex: 0,
              blknum: 19774001
            }
          ],
          outputs: [
            {
              outputType: 1,
              outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
              currency: '0x0000000000000000000000000000000000000000',
              amount: '123'
            }
          ],
          metadata: '0x0000000000000000000000000000000000000000',
          txData: 0
        } as Interfaces.ITransactionBody,
        decodedTx
      );
    });
  
    it('should create a hex-encoded unsigned transaction with 4 inputs and 4 outputs', function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 19774001
          },
          {
            txindex: 0,
            oindex: 0,
            blknum: 19774002
          },
          {
            txindex: 0,
            oindex: 1,
            blknum: 19774002
          },
          {
            txindex: 10,
            oindex: 0,
            blknum: 19774002
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 1000000000000000000
          },
          {
            outputType: 1,
            outputGuard: '0x3272ee86d8192f59261960c9ae186063c8c9041f',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 1000000000000000000
          },
          {
            outputType: 1,
            outputGuard: '0x99d7b5c57c16acb24a327a37356a804a2f75dade',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 100000000
          },
          {
            outputType: 1,
            outputGuard: '0xbfdf85743ef16cfb1f8d4dd1dfc74c51dc496434',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 100
          }
        ],
        txData: 0
      };
  
      const unsignedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const expectedTx = '0xf9015701f884a0000000000000000000000000000000000000000000000000004640596164aa00a0000000000000000000000000000000000000000000000000004640599cff7400a0000000000000000000000000000000000000000000000000004640599cff7401a0000000000000000000000000000000000000000000000000004640599d00faa0f8ccf501f394f4ebbe787311bb955bb353b7a4d8b97af8ed1c9b940000000000000000000000000000000000000000880de0b6b3a7640000f501f3943272ee86d8192f59261960c9ae186063c8c9041f940000000000000000000000000000000000000000880de0b6b3a7640000f101ef9499d7b5c57c16acb24a327a37356a804a2f75dade9400000000000000000000000000000000000000008405f5e100ed01eb94bfdf85743ef16cfb1f8d4dd1dfc74c51dc496434940000000000000000000000000000000000000000648080';
      assert.equal(unsignedTx, expectedTx);
    });
  
    it('should encode a transaction with no outputs', function () {
      const txBody = {
        txType: 1,
        inputs: [
          {
            txindex: 0,
            oindex: 0,
            blknum: 19774001
          }
        ],
        outputs: [],
        txData: 0
      };
      const unsignedTx = Encoders.encodeTransaction(txBody as Interfaces.ITransactionBody);
      const expectedTx = '0xe601e1a0000000000000000000000000000000000000000000000000004640596164aa00c08080';
      assert.equal(unsignedTx, expectedTx);
    });
  
    describe('encodeDeposit', function () {
      it('should return an encoded deposit transaction', async function () {
        const address = '0x854951e37c68a99a52d9e3ae15e0cb62184a613e';
        const amount = 333;
        const expected = '0xf85501c0f0ef01ed94854951e37c68a99a52d9e3ae15e0cb62184a613e94000000000000000000000000000000000000000082014d80a00000000000000000000000000000000000000000000000000000000000000000';
  
        const encoded = Encoders.encodeDeposit({
          owner: address,
          amount,
          currency: Constants.CURRENCY_MAP.ETH
        });
        assert.equal(encoded, expected);
      });
  
      it('should return an encoded deposit transaction when amount as a string', async function () {
        const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2';
        const amount = '1000000000000000000';
        const expected = '0xf85b01c0f6f501f39460c5bc2de80acda5016c1e81f61620adbc730dd2940000000000000000000000000000000000000000880de0b6b3a764000080a00000000000000000000000000000000000000000000000000000000000000000';
  
        const encoded = Encoders.encodeDeposit({
          owner: address,
          amount,
          currency: Constants.CURRENCY_MAP.ETH
        });
        assert.equal(encoded, expected);
      });
  
      it('should return an encoded deposit transaction when currency does not start with 0x', async function () {
        const address = '0x60c5bc2de80acda5016c1e81f61620adbc730dd2';
        const amount = '3000000000000000000000';
        const expected = '0xf85c01c0f7f601f49460c5bc2de80acda5016c1e81f61620adbc730dd294000000000000000000000000000000000000000089a2a15d09519be0000080a00000000000000000000000000000000000000000000000000000000000000000';
  
        const encoded = Encoders.encodeDeposit({
          owner: address,
          amount,
          currency: '0000000000000000000000000000000000000000'
        });
        assert.equal(encoded, expected);
      });
    });
  });

  describe('Encode UTXO tests', function () {
    it('should return the encoded utxo position 1', function () {
      const utxo = {
        blknum: 96035000,
        currency: Constants.CURRENCY_MAP.ETH,
        oindex: 0,
        txbytes: '',
        txindex: 0
      };
  
      const utxoPos = Encoders.encodeUtxoPos(utxo);
      assert.equal(utxoPos.toString(), '96035000000000000');
    });
  
    it('should return the encoded utxo position 2', function () {
      const utxo = {
        blknum: 96035000,
        currency: Constants.CURRENCY_MAP.ETH,
        oindex: 1,
        txbytes: '',
        txindex: 7
      };
  
      const utxoPos = Encoders.encodeUtxoPos(utxo);
      assert.equal(utxoPos.toString(), '96035000000070001');
    });
  
    it('should return the encoded utxo position 3', function () {
      const utxo = {
        blknum: 777777777,
        currency: Constants.CURRENCY_MAP.ETH,
        oindex: 999,
        txbytes: '',
        txindex: 8888
      };
  
      const utxoPos = Encoders.encodeUtxoPos(utxo);
      assert.equal(utxoPos.toString(), '777777777088880999');
    });
  });
});
