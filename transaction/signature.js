// generates signature
global.Buffer = global.Buffer || require('buffer').Buffer
const keccak256 = require('js-sha3').keccak256
const signatureDigest = require('./sigDigest')
const { rlpEncodeArr } = require('./rlp')

const hash = async (message) => {
  let hexValue = await keccak256(message)
  let bufferValue = Buffer.from(hexValue, 'hex')
  let uint8Value = new Uint8Array(bufferValue)
  return uint8Value
}

const signature = async (encodedTx, privateKey) => {
  // TODO: Add logic to add 0 to function without message inputs

  let hashedMsg = await hash(encodedTx)
  let signed = signatureDigest(hashedMsg, privateKey)
  let signedToArr = Array.from(signed)
  return signedToArr
}

// for when there is encodedTx but, no privateKey available
const zeroSignature = () => {
  let zeroBytes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  return zeroBytes
}

// sign an encoded signature
const signedEncode = async (tx, sig1, sig2) => {
  let transactionBody = [
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
    tx.amount2,
    sig1,
    sig2
  ]

  let rlpEncoded = await rlpEncodeArr(transactionBody)
  return rlpEncoded
}

const singleSign = async (tx, priv1) => {
  // transform tx into array format
  let txArray =
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
  // encode tx array
  let encodedTx = await rlpEncodeArr(txArray)
  // generate first signature (signature function)
  let sig1 = await signature(encodedTx, priv1)
  // generate second signature (zero signature function)
  let sig2 = await zeroSignature()
  // generate signedTxBytes (with another Signed.encode function)
  let signedTxBytes = await signedEncode(tx, sig1, sig2)
  // putting it all together and return the object
  let signedTransaction = {
    raw_tx: tx,
    sig1,
    sig2,
    signedTxBytes
  }

  return signedTransaction
}

module.exports = { signature, hash, signedEncode, zeroSignature, singleSign }
