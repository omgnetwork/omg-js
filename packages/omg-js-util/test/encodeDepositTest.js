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

// testing ETH function
const chai = require('chai')
const assert = chai.assert
const transaction = require('../src/transaction')

describe('encodeDepositTx', () => {
  it('should encodeDepositTx', async () => {
    const address = '0x854951e37c68a99a52d9e3ae15e0cb62184a613e'
    const amount = 333
    const ENCODED = '0xF8C5D0C3808080C3808080C3808080C3808080F8B2ED94854951E37C68A99A52D9E3AE15E0CB62184A613E94000000000000000000000000000000000000000082014DEB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080EB94000000000000000000000000000000000000000094000000000000000000000000000000000000000080'

    const encoded = transaction.encodeDepositTx(address, amount, transaction.NULL_ADDRESS)
    assert.equal(encoded, ENCODED)
  })
})
