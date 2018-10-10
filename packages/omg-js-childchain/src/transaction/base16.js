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

// decoding and encoding BASE16 Values

const BASE16 = '0123456789abcdef'
let bs16 = require('base-x')(BASE16)
const debug = require('debug')('omg.childchain.base16')

function base16Decode (encodedHash) {
  let lowerCaseHash = encodedHash.toLowerCase()
  let decoded = JSON.stringify(bs16.decode(lowerCaseHash))
  let decodedObject = JSON.parse(decoded).data
  debug(`decoded object is: ${decodedObject}`)
  return decodedObject
}

// encoding function
function base16Encode (binary) {
  let base16Encoded = bs16.encode(binary).toUpperCase()
  debug(`encoded object is: ${base16Encoded}`)
  return base16Encoded
}

module.exports = { base16Encode, base16Decode }
