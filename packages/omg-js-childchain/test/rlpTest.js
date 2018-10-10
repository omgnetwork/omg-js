/* 
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

// Test for RLP Encode function
// Test Case based on Demo1 in omg repo

const { rlpEncodeArr } = require('../src/transaction/rlp')
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const assert = require('chai').assert

/* dummy data */
// this does not have signature

const inputRaw =
  [
    263001,
    0,
    0,
    0,
    0,
    0,
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [116, 90, 78, 212, 118, 51, 233, 165, 245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65],
    7,
    [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80],
    3
  ]

const txRlpEncoded =
  [
    248, 74, 131, 4, 3, 89, 128, 128, 128, 128, 128, 148, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 148, 116, 90, 78, 212, 118, 51, 233, 165,
    245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65, 7, 148, 101, 166, 194,
    146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80,
    3
  ]

describe('should handle RLP conversions', () => {
  it('should RLP encode', () => {
    let rlpEncoded = rlpEncodeArr(inputRaw)
    assert.deepEqual(rlpEncoded, txRlpEncoded)
  })
})
