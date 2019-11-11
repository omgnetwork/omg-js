/*
Copyright 2019 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

global.Buffer = global.Buffer || require('buffer').Buffer

const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')

function ecSign (tosign, privateKey) {
  const signed = ethUtil.ecsign(
    tosign,
    Buffer.from(privateKey.replace('0x', ''), 'hex')
  )
  return sigUtil.concatSig(signed.v, signed.r, signed.s)
}

function sign (tx, privateKeys) {
  return privateKeys.map(key => ecSign(tx, key))
}

module.exports = sign
