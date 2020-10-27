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

import { hashTypedDataMessage, hashTypedDataDomain } from '../structHash';
import { getTypedData } from '../typedData';

const plasmaContractAddress = '0xecda6da8fddd416837bdcf38d6e17a4a898534eb';
const txBody = {
  txType: 1,
  inputs: [
    {
      amount: 5555431,
      blknum: 2000,
      currency: '0x0000000000000000000000000000000000000000',
      oindex: 1,
      owner: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
      txindex: 0,
      utxo_pos: 2000000000001
    }
  ],
  outputs: [
    {
      outputType: 1,
      outputGuard: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
      currency: '0x0000000000000000000000000000000000000000',
      amount: 123
    },
    {
      outputType: 1,
      outputGuard: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
      currency: '0x0000000000000000000000000000000000000000',
      amount: 5555308
    }
  ],
  txData: 0
};

describe('transaction/structHash test', function () {
  const typedData = getTypedData.call({
    plasmaContractAddress
  }, txBody);

  describe('hashTypedDataMessage', function () {
    it('should hash typed data message correctly', function () {
      assert.equal(
        hashTypedDataMessage(typedData),
        '0xda72c569715ec056d9182fa3c58f3a456467c3fb2bb55ab23f9404eff90be694'
      );
    });
  });
  
  describe('hashTypedDataDomain', function () {
    it('should get domain seperator hash correctly', function () {
      assert.equal(
        hashTypedDataDomain(typedData),
        '0x6c650db4cf8537eca556551a536134f12df128b0628180c031ec65cdb08e6295'
      );
    });
  });
});
