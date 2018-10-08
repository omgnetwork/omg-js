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

function rlpDecode (data) {
  return RLP.decode(data)
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

module.exports = {
  rlpEncodeArr,
  rlpDecode,
  ArrToUint8
}
