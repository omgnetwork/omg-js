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

// convert hex to byteArr

function hexToByteArr (hex) {
  // delete 0x prefix if exists
  if (hex.includes('0x')) {
    hex = hex.replace('0x', '')
  }
  let buffered = Buffer.from(hex, 'hex')
  let uint8Value = new Uint8Array(buffered)
  return uint8Value
}

module.exports = hexToByteArr
