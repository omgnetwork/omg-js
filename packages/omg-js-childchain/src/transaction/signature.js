// generates signature
global.Buffer = global.Buffer || require('buffer').Buffer
const keccak256 = require('js-sha3').keccak256
const signatureDigest = require('./sigDigest')
const { rlpEncodeArr, rlpDecode } = require('./rlp')
const debug = require('debug')('omg.childchain.signatureDigest')
var EthUtil = require('ethereumjs-util')
var sigUtil = require('eth-sig-util')

function hash (message) {
  let hexValue = keccak256(message)
  let bufferValue = Buffer.from(hexValue, 'hex')
  let uint8Value = new Uint8Array(bufferValue)
  return uint8Value
}

function signature (encodedTx, privateKey) {
  // TODO: Add logic to add 0 to function without message inputs

  let hashedMsg = hash(encodedTx)
  let signed = signatureDigest(hashedMsg, privateKey)
  let signedToArr = Array.from(signed)
  return signedToArr
}

const ZERO_SIG = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

// sign an encoded signature
function signedEncode (tx, sig1, sig2) {
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

  let rlpEncoded = rlpEncodeArr(transactionBody)
  return rlpEncoded
}

function singleSign (tx, priv1) {
  // transform tx into array format
  let txArray = [
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
  let encodedTx = rlpEncodeArr(txArray)
  // generate first signature (signature function)
  let sig1 = signature(encodedTx, priv1)
  // generate second signature (zero signature function)
  let sig2 = ZERO_SIG
  // generate signedTxBytes (with another Signed.encode function)
  let signedTxBytes = signedEncode(tx, sig1, sig2)
  // putting it all together and return the object
  let signedTransaction = {
    raw_tx: tx,
    sig1,
    sig2,
    signedTxBytes
  }
  debug(`signed transaction object is: ${JSON.stringify(signedTransaction)}`)
  return signedTransaction
}

const RLP = require('rlp')

function sign (tx, privateKey) {
  let encoded = RLP.encode(tx)
  let stringifyJSON = JSON.stringify(encoded)
  let rlpEncoded = JSON.parse(stringifyJSON).data
  let sig1 = signature(rlpEncoded, privateKey)
  // generate second signature (zero signature function)
  // let sig2 = ZERO_SIG
  // generate signedTxBytes (with another Signed.encode function)
  let signedTxBytes = signedEncode(tx, sig1, sig2)
  // putting it all together and return the object
  let signedTransaction = {
    raw_tx: tx,
    sig1,
    sig2,
    signedTxBytes
  }
  debug(`signed transaction object is: ${JSON.stringify(signedTransaction)}`)
  return signedTransaction
}

function sign2 (tx, privateKey) {
  let signed = signatureDigest(tx, privateKey)
  let sig1 = Array.from(signed)
  // generate second signature (zero signature function)
  let sig2 = ZERO_SIG
  // generate signedTxBytes (with another Signed.encode function)
  let signedTxBytes = signedEncode(tx, sig1, sig2)
  // putting it all together and return the object
  let signedTransaction = {
    raw_tx: tx,
    sig1,
    sig2,
    signedTxBytes
  }
  debug(`signed transaction object is: ${JSON.stringify(signedTransaction)}`)
  return signedTransaction
}

function hexToByteArr (hex) {
  // delete 0x prefix if exists
  if (hex.includes('0x')) {
    hex = hex.replace('0x', '')
  }
  let buffered = Buffer.from(hex, 'hex')
  let uint8Value = new Uint8Array(buffered)
  return uint8Value
}

function ecSign (tosign, privateKey) {
  if (privateKey.includes('0x')) {
    privateKey = privateKey.replace('0x', '')
  }
  const buffedPriv = Buffer.from(privateKey, 'hex')
  const hexValue = keccak256(tosign)
  const ecSigned = EthUtil.ecsign(Buffer.from(hexValue, 'hex'), buffedPriv)
  return EthUtil.bufferToHex(sigUtil.concatSig(ecSigned.v, ecSigned.r, ecSigned.s))
}

function sign3 (tosign, privateKey) {
  const signature = ecSign(tosign, privateKey)
  let tmp = hexToByteArr(signature)
  let sig1 = Array.from(tmp)

  // Use zero sig for the second signature
  let sig2 = ZERO_SIG

  // rlp decode the tx bytes
  const decodedTx = rlpDecode(tosign)
  // Append the signatures

  const signedTx = [ ...decodedTx, sig1, sig2 ]

  const encodedSignedTx = rlpEncodeArr(signedTx)

  debug(`signed transaction: ${encodedSignedTx}`)
  return encodedSignedTx
}

module.exports = {
  signature,
  hash,
  signedEncode,
  singleSign: sign3
}
