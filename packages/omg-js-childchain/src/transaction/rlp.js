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

// encoding & decoding to RLP
const RLP = require('rlp')
const debug = require('debug')('omg.childchain.rlp')
/*
struct
[
    tx.blknum1,
    tx.txindex1,
    tx.oindex1,
    tx.blknum2,
    tx.txindex2,
    tx.oindex2,
    tx.cur12,
    tx.newowner1,
    tx.amount1,
    tx.newowner2,
    tx.amount2
]
*/

// encode rawTx into RLP encoded Buffer
// replicate Transaction.encode() function
function rlpEncodeArr (rawTx) {
  // if is Array, turn into Uint8 and Transform to Buffer
  let arr = ArrToUint8(rawTx)
  let encoded = RLP.encode(arr)
  let stringifyJSON = JSON.stringify(encoded)
  let rlpEncoded = JSON.parse(stringifyJSON).data
  debug(`rlp encoded array is: ${rlpEncoded}`)
  return rlpEncoded
}

// private function, turns regular arr into arr with Buffer binary
function ArrToUint8 (arr) {
  for (var i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      arr[i] = Buffer.from(new Uint8Array(arr[i]))
    }
  }
  return arr
}

module.exports = { rlpEncodeArr, ArrToUint8 }
