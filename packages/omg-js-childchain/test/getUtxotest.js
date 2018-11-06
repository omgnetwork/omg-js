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

const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const ChildChain = require('../src')
const nock = require('nock')

chai.use(chaiAsPromised)
const assert = chai.assert

const watcherUrl = 'http://omg-watcher'

describe('getUtxo', () => {
  it('should return object with empty array as utxo with an address', async () => {
    const address = '0xd72afdfa06ae5857a639051444f7608fea1528d4'
    const expectedObject = {
      utxos: [],
      address
    }

    nock(watcherUrl)
      .get(`/utxos?address=${address}`)
      .reply(200, { result: 'success', data: expectedObject })

    const childChain = new ChildChain(watcherUrl, '')
    const returnUtxo = await childChain.getUtxos(address)
    assert.deepEqual(expectedObject, returnUtxo)
  })

  it('should throw an error on failure', async () => {
    const address = '0x01234'
    const errorObject = {
      code: 'the_error_code',
      description: 'The error description'
    }

    nock(watcherUrl)
      .get(`/utxos?address=${address}`)
      .reply(200, { result: 'error', data: errorObject })

    const childChain = new ChildChain(watcherUrl, '')
    return assert.isRejected(childChain.getUtxos(address), Error, errorObject.description)
  })
})
