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

import { assert, should, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import BN from 'bn.js';

import * as TxBuilder from '../txBuilder';
import * as Constants from '../../common/constants';

should();
use(chaiAsPromised);

describe('transaction/txBuilder test', function () {
  describe('createTransactionBody', function () {
    it('should create a transaction body from one input and give change', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 1000000000000000000
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = 600000000000000000;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toAmount,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        }
      });
      assert.equal(txBody.outputs.length, 2);
      assert.equal(txBody.inputs.length, 1);
  
      const paymentOutput = txBody.outputs.find(i => i.outputGuard === toAddress);
      const changeOutput = txBody.outputs.find(i => i.outputGuard === fromAddress);
  
      assert.equal(paymentOutput.amount.toString(), toAmount.toString());
      const expectedChange = new BN(fromUtxos[0].amount.toString()).sub(
        new BN(toAmount.toString())
      );
      assert.equal(
        changeOutput.amount.toString(),
        expectedChange.toString()
      );
    });
  
    it('should create a transaction body from two inputs and give change', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        },
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = 16;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toAmount,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        }
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 2);
  
      const paymentOutput = txBody.outputs.find(i => i.outputGuard === toAddress);
      const changeOutput = txBody.outputs.find(i => i.outputGuard === fromAddress);
  
      assert.equal(paymentOutput.amount.toString(), toAmount.toString());
      const expectedChange = new BN(fromUtxos[0].amount.toString())
        .add(new BN(fromUtxos[1].amount))
        .sub(new BN(toAmount));
      assert.equal(
        changeOutput.amount.toString(),
        expectedChange.toString()
      );
    });
  
    it('should create a transaction body from two inputs for the exact amount, and not give change', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        },
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = 20;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toAmount,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        }
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 1);
      assert.equal(txBody.outputs[0].outputGuard, toAddress);
      assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString());
    });
  
    it('should create a transaction body from one input for the exact amount, and not give change', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 1000000000000000000
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = fromUtxos[0].amount;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toAmount,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        }
      });
      assert.equal(txBody.inputs.length, 1);
      assert.equal(txBody.outputs.length, 1);
      assert.equal(txBody.outputs[0].outputGuard, toAddress);
      assert.equal(txBody.outputs[0].amount.toString(), toAmount.toString());
    });
  
    it('should create a transaction body from two input included fee, and give change for the erc20', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fakeErc20 = '0xFakeERc20';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10000000000
        },
        {
          txindex: 1,
          oindex: 0,
          currency: fakeErc20,
          blknum: 19774008,
          amount: 1000
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toSendErc20Amount = 500;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toSendErc20Amount,
          currency: fakeErc20
        }],
        fee: {
          amount: 50,
          currency: Constants.CURRENCY_MAP.ETH
        }
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 3);
  
      const changeOutputs = txBody.outputs.filter(i => i.outputGuard === fromAddress);
      const paymentOutputs = txBody.outputs.filter(i => i.outputGuard === toAddress);
  
      assert.equal(changeOutputs.length, 2);
      assert.equal(paymentOutputs.length, 1);
      assert.exists(
        paymentOutputs.find(i => i.amount.toString() === toSendErc20Amount.toString())
      );
      assert.exists(
        changeOutputs.find(i => i.amount.toString() === (fromUtxos[0].amount - 50).toString())
      );
      assert.exists(
        changeOutputs.find(i => i.amount.toString() === (fromUtxos[1].amount - toSendErc20Amount).toString())
      );
    });
  
    it('should create a transaction body from two input included fee as erc20', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fakeErc20 = '0xFakeERc20';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10000000000
        },
        {
          txindex: 1,
          oindex: 0,
          currency: fakeErc20,
          blknum: 19774008,
          amount: 1000
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toSendEthAmount = 500;
  
      const txBody = TxBuilder.createTransactionBody({
        fromAddress,
        fromUtxos,
        payments: [{
          owner: toAddress,
          amount: toSendEthAmount,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 50,
          currency: fakeErc20
        }
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 3);
  
      const changeOutputs = txBody.outputs.filter(i => i.outputGuard === fromAddress);
      const paymentOutputs = txBody.outputs.filter(i => i.outputGuard === toAddress);
      assert.equal(changeOutputs.length, 2);
      assert.equal(paymentOutputs.length, 1);
  
      assert.exists(
        paymentOutputs.find(i => i.amount.toString() === toSendEthAmount.toString())
      );
      assert.exists(
        changeOutputs.find(i => i.amount.toString() === (fromUtxos[0].amount - toSendEthAmount).toString())
      );
      assert.exists(
        changeOutputs.find(i => i.amount.toString() === (fromUtxos[1].amount - 50).toString())
      );
    });
  
    it('should fail to create a transaction with insufficient funds and return correct required amount', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = 100;
  
      return assert.throws(
        () =>
          TxBuilder.createTransactionBody({
            fromAddress,
            fromUtxos,
            payments: [{
              owner: toAddress,
              amount: toAmount,
              currency: Constants.CURRENCY_MAP.ETH
            }],
            fee: {
              amount: 0,
              currency: Constants.CURRENCY_MAP.ETH
            }
          }),
        Error,
        /Insufficient funds. Needs 90 more of 0x0000000000000000000000000000000000000000 to cover payments and fees/
      );
    });
  
    it('should fail to create a transaction with multi currency insufficient funds', function () {
      const fromAddress = '0xf4ebbe787311bb955bb353b7a4d8b97af8ed1c9b';
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 19774001,
          amount: 10
        },
        {
          txindex: 0,
          oindex: 0,
          currency: '0xerc20-1',
          blknum: 19774001,
          amount: 10
        },
        {
          txindex: 0,
          oindex: 0,
          currency: '0xerc20-2',
          blknum: 19774001,
          amount: 10
        }
      ];
  
      const toAddress = '0x3272ee86d8192f59261960c9ae186063c8c9041f';
      const toAmount = 100;
  
      return assert.throws(
        () =>
          TxBuilder.createTransactionBody({
            fromAddress,
            fromUtxos,
            payments: [{
              owner: toAddress,
              amount: toAmount,
              currency: Constants.CURRENCY_MAP.ETH
            }],
            fee: {
              amount: 0,
              currency: Constants.CURRENCY_MAP.ETH
            },
            metadata: undefined
          }),
        Error,
        /Insufficient funds. Needs 90 more of 0x0000000000000000000000000000000000000000 to cover payments and fees/
      );
    });
  
    it('should select relevant UTXOs as inputs and disregard unneccessary ones', function () {
      const txBody = TxBuilder.createTransactionBody({
        fromAddress: '0xfromAddress',
        fromUtxos: [
          {
            txindex: 0,
            oindex: 0,
            currency: '0xfakeErc20',
            blknum: 3000,
            amount: 1000
          },
          {
            txindex: 0,
            oindex: 0,
            currency: Constants.CURRENCY_MAP.ETH,
            blknum: 1,
            amount: 10
          },
          {
            txindex: 0,
            oindex: 0,
            currency: Constants.CURRENCY_MAP.ETH,
            blknum: 2,
            amount: 10
          }
        ],
        payments: [{
          owner: '0xtoAddress',
          amount: 5,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        },
        metadata: undefined
      });
      assert.equal(txBody.inputs.length, 1);
      assert.equal(txBody.outputs.length, 2);
  
      const changeOutputs = txBody.outputs.filter(i => i.outputGuard === '0xfromAddress');
      const paymentOutputs = txBody.outputs.filter(i => i.outputGuard === '0xtoAddress');
      assert.equal(changeOutputs.length, 1);
      assert.equal(paymentOutputs.length, 1);
    });
  
    it('should select relevant UTXOs and respect the order of priority', function () {
      const txBody = TxBuilder.createTransactionBody({
        fromAddress: '0xfromAddress',
        fromUtxos: [
          {
            txindex: 0,
            oindex: 0,
            currency: Constants.CURRENCY_MAP.ETH,
            blknum: 1,
            amount: 5
          },
          {
            txindex: 0,
            oindex: 0,
            currency: '0xfakeErc20',
            blknum: 3000,
            amount: 1000
          },
          {
            txindex: 0,
            oindex: 0,
            currency: Constants.CURRENCY_MAP.ETH,
            blknum: 2,
            amount: 5
          },
          {
            txindex: 0,
            oindex: 0,
            currency: Constants.CURRENCY_MAP.ETH,
            blknum: 3,
            amount: 10
          }
        ],
        payments: [{
          owner: '0xtoAddress',
          amount: 10,
          currency: Constants.CURRENCY_MAP.ETH
        }],
        fee: {
          amount: 0,
          currency: Constants.CURRENCY_MAP.ETH
        },
        metadata: undefined
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 1);
  
      const inputUtxos = txBody.inputs.filter(i => i.amount === 5);
      assert.equal(inputUtxos.length, 2);
  
      const changeOutputs = txBody.outputs.filter(i => i.outputGuard === '0xfromAddress');
      const paymentOutputs = txBody.outputs.filter(i => i.outputGuard === '0xtoAddress');
      assert.equal(changeOutputs.length, 0);
      assert.equal(paymentOutputs.length, 1);
    });
  
    it('should throw error if transaction will involve too many inputs, respecting priority', function () {
      return assert.throws(
        () =>
          TxBuilder.createTransactionBody({
            fromAddress: '0xfromAddress',
            fromUtxos: [
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 1,
                amount: 1
              },
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 2,
                amount: 1
              },
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 3,
                amount: 1
              },
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 4,
                amount: 1
              },
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 5,
                amount: 1
              },
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 6,
                amount: 10
              }
            ],
            payments: [{
              owner: '0xtoAddress',
              amount: 5,
              currency: Constants.CURRENCY_MAP.ETH
            }],
            fee: {
              amount: 0,
              currency: Constants.CURRENCY_MAP.ETH
            }
          }),
        Error,
        /Inputs must be an array of size > 0 and < 4/
      );
    });
  
    it('should throw error if transaction will involve too many outputs', function () {
      return assert.throws(
        () =>
          TxBuilder.createTransactionBody({
            fromAddress: '0xfromAddress',
            fromUtxos: [
              {
                txindex: 0,
                oindex: 0,
                currency: Constants.CURRENCY_MAP.ETH,
                blknum: 1,
                amount: 10
              },
              {
                txindex: 0,
                oindex: 0,
                currency: '0xfakeerc20',
                blknum: 2,
                amount: 10
              }
            ],
            payments: [
              {
                owner: '0xtoAddress1',
                amount: 1,
                currency: Constants.CURRENCY_MAP.ETH
              },
              {
                owner: '0xtoAddress2',
                amount: 1,
                currency: Constants.CURRENCY_MAP.ETH
              },
              {
                owner: '0xtoAddress3',
                amount: 1,
                currency: '0xfakeerc20'
              }
            ],
            fee: {
              amount: 1,
              currency: '0xfakeerc20'
            },
            metadata: undefined
          }),
        Error,
        /Outputs must be an array of size < 4/
      );
    });
  
    it('should calculate correct change for multi-currency multi-payments', function () {
      const fromUtxos = [
        {
          txindex: 0,
          oindex: 0,
          currency: Constants.CURRENCY_MAP.ETH,
          blknum: 1,
          amount: 10
        },
        {
          txindex: 0,
          oindex: 0,
          currency: '0xfakeErc20',
          blknum: 2,
          amount: 1
        },
        {
          txindex: 0,
          oindex: 0,
          currency: '0xfakeErc20',
          blknum: 3,
          amount: 1
        }
      ];
      const payments = [
        {
          owner: '0xtoAddress1',
          amount: 1,
          currency: Constants.CURRENCY_MAP.ETH
        },
        {
          owner: '0xtoAddress2',
          amount: 1,
          currency: '0xfakeErc20'
        }
      ];
      const fee = {
        amount: 1,
        currency: Constants.CURRENCY_MAP.ETH
      };
      const txBody = TxBuilder.createTransactionBody({
        fromAddress: '0xfromAddress',
        fromUtxos,
        payments,
        fee,
        metadata: undefined
      });
      assert.equal(txBody.inputs.length, 2);
      assert.equal(txBody.outputs.length, 3);
  
      const inputUtxos = txBody.inputs.filter(i => i.currency === '0xfakeErc20');
      assert.equal(inputUtxos.length, 1);
  
      const changeOutputs = txBody.outputs.filter(i => i.outputGuard === '0xfromAddress');
      const paymentOutputs = txBody.outputs.filter(i => i.outputGuard !== '0xfromAddress');
      assert.equal(changeOutputs.length, 1);
      assert.equal(paymentOutputs.length, 2);
      assert.equal(
        Number(changeOutputs[0].amount.toString()),
        fromUtxos[0].amount - payments[0].amount - fee.amount
      );
      assert.equal(paymentOutputs[0].amount.toString(), payments[0].amount.toString());
      assert.equal(paymentOutputs[1].amount.toString(), payments[1].amount.toString());
    });
  });

  describe('mergeUtxosToOutput', function () {
    it('should merge utxo inputs to an output', function () {
      const utxos = [
        {
          amount: 1,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 2,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 10,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        }
      ];
  
      const outputUtxo = TxBuilder.mergeUtxosToOutput(utxos);
      assert.equal(outputUtxo.amount.toString(), '13');
    });
  
    it('should throw error if provide less than 2 utxos', function () {
      const utxos = [
        {
          amount: 1,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        }
      ];
  
      assert.throws(
        () => TxBuilder.mergeUtxosToOutput(utxos),
        Error,
        /Must merge at least 2 utxos/
      );
    });
  
    it('should throw error if provide more than 4 utxos', function () {
      const utxos = [
        {
          amount: 1,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 2,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 10,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 11,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 15,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        }
      ];
  
      assert.throws(
        () => TxBuilder.mergeUtxosToOutput(utxos),
        Error,
        /Cannot merge more than 4 utxos/
      );
    });

    it('should throw error if currency is different', function () {
      const utxos = [
        {
          amount: 1,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 2,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 10,
          blknum: 1,
          creating_txhash: 'hash',
          currency: '0xabc',
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 11,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        }
      ];
  
      assert.throws(() => TxBuilder.mergeUtxosToOutput(utxos), Error, /All utxo currency must be the same/);
    });
  
    it('should throw error if owner is different', function () {
      const utxos = [
        {
          amount: 1,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae523',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 2,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 10,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        },
        {
          amount: 11,
          blknum: 1,
          creating_txhash: 'hash',
          currency: Constants.CURRENCY_MAP.ETH,
          oindex: 1,
          otype: 1,
          owner: '0x14c2f6ee17a2026ca320b2f677220861abaae525',
          spending_txhash: '0x',
          txindex: 1,
          utxo_pos: 1
        }
      ];
  
      assert.throws(() => TxBuilder.mergeUtxosToOutput(utxos), Error, /All utxo owner must be the same/);
    });
  });

  describe('validateInputs and validateOutputs', function () {
    it('should fail to create a transaction with 0 inputs', function () {
      return assert.throws(
        () => TxBuilder.validateInputs([]),
        Error,
        /Inputs must be an array of size/
      );
    });
  
    it('should fail to create a transaction with too many inputs', function () {
      return assert.throws(
        () => TxBuilder.validateInputs([{}, {}, {}, {}, {}]),
        Error,
        /Inputs must be an array of size/
      );
    });
  
    it('should fail to create a transaction with too many outputs', function () {
      return assert.throws(
        () => TxBuilder.validateOutputs([{}, {}, {}, {}, {}]),
        Error,
        /Outputs must be an array of size/
      );
    });
  });
});
