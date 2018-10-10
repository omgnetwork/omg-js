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

var EthUtil = require('ethereumjs-util')
var sigUtil = require('eth-sig-util')
const { hexToByteArr, byteArrToBuffer } = require('@omisego/omg-js-util')
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
