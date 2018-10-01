var EthUtil = require('ethereumjs-util')
var sigUtil = require('eth-sig-util')
const { hexToByteArr, byteArrToBuffer } = require('omg-js-util')
global.Buffer = global.Buffer || require('buffer').Buffer
const debug = require('debug')('omg.childchain.signatureDigest')

// call this is implementation of signature_digest function
function signatureDigest (hashed, priv) {
  let buffedHash = byteArrToBuffer(hashed)
  let buffedPriv = byteArrToBuffer(priv)
  // let toBuffer = EthUtil.toBuffer(hashed)
  let ecSigned = EthUtil.ecsign(buffedHash, buffedPriv)
  let rpcSig = EthUtil.bufferToHex(sigUtil.concatSig(ecSigned.v, ecSigned.r, ecSigned.s))
  let rpcSigInByte = hexToByteArr(rpcSig)
  debug(`low level signature signed by private key is: ${rpcSigInByte}`)
  return rpcSigInByte
}

module.exports = signatureDigest
