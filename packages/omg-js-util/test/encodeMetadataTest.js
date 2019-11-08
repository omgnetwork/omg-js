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

const chai = require('chai')
const assert = chai.assert
const transaction = require('../src/transaction')

describe('Encode metadata tests', () => {
  it('should encode/decode a string', () => {
    const str = '00100'
    return assert.equal(transaction.decodeMetadata(transaction.encodeMetadata(str)), str)
  })
  it('should encode/decode a string', () => {
    const str = 'The quick brown fox'
    return assert.equal(transaction.decodeMetadata(transaction.encodeMetadata(str)), str)
  })
  it('should encode/decode a string', () => {
    const str = 'Unicode ₿itcoin, さとし'
    return assert.equal(transaction.decodeMetadata(transaction.encodeMetadata(str)), str)
  })
})
