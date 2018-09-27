var EthUtil = require('ethereumjs-util')
var sigUtil = require('eth-sig-util')
var hexToByteArr = require('../helpers/hexToByteArr')
const byteArrToBuffer = require('../helpers/byteArrToBuffer')
global.Buffer = global.Buffer || require('buffer').Buffer

// call this is implementation of signature_digest function
function signatureDigest (hashed, priv) {
  let buffedHash = byteArrToBuffer(hashed)
  let buffedPriv = byteArrToBuffer(priv)
  // let toBuffer = EthUtil.toBuffer(hashed)
  let ecSigned = EthUtil.ecsign(buffedHash, buffedPriv)
  let rpcSig = EthUtil.bufferToHex(sigUtil.concatSig(ecSigned.v, ecSigned.r, ecSigned.s))
  let hexToUint8 = hexToByteArr(rpcSig)
  return hexToUint8
}

module.exports = signatureDigest
