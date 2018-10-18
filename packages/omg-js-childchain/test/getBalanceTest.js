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

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const ChildChain = require('../src')
const nock = require('nock')

chai.use(chaiAsPromised)
const assert = chai.assert

const watcherUrl = 'http://omg-watcher'

describe('getBalance', () => {
  // Test skipped until watcher/account/${address}/balance api is deployed
  it.skip('should return the balance of an address', async () => {
    const address = '0xd72afdfa06ae5857a639051444f7608fea1528d4'
    const expectedObject = [{
      currency: '00000000000000000000',
      amount: 1000000000000000000
    }]

    nock(watcherUrl)
      .get(`/account/${address}/balance`)
      .reply(200, { result: 'success', data: expectedObject })

    const childChain = new ChildChain(watcherUrl, '')
    const result = await childChain.getBalance(address)
    assert(Array.isArray(result))
    assert.equal(result.length, 1)
    assert.equal(expectedObject[0].currency, result[0].currency)
    assert.equal(expectedObject[0].amount.toString(), result[0].amount.toString())
  })

  // Test skipped until watcher/account/${address}/balance api is deployed
  it.skip('should throw an error on failure', async () => {
    const address = '0x01234'
    const errorObject = {
      code: 'the_error_code',
      description: 'The error description'
    }

    nock(watcherUrl)
      .get(`/account/${address}/balance`)
      .reply(200, { result: 'error', data: errorObject })

    const childChain = new ChildChain(watcherUrl, '')
    return assert.isRejected(childChain.getBalance(address), Error, errorObject.description)
  })

  // Temp test. Remove this when watcher/account/${address}/balance api is live
  it('should calculate the balance from utxos', async () => {
    const address = '0xd72afdfa06ae5857a639051444f7608fea1528d4'
    const expectedObject = [
      { currency: '00000000000000000000', amount: 1000000000000000000 },
      { currency: '11100000000000000999', amount: 56 }
    ]

    const utxos = [
      { currency: '00000000000000000000', amount: 600000000000000000 },
      { currency: '00000000000000000000', amount: 400000000000000000 },
      { currency: '11100000000000000999', amount: 50 },
      { currency: '11100000000000000999', amount: 4 },
      { currency: '11100000000000000999', amount: 2 }
    ]

    nock(watcherUrl)
      .get(`/utxos?address=${address}`)
      .reply(200, { result: 'success', data: utxos })

    const childChain = new ChildChain(watcherUrl, '')
    const result = await childChain.getBalance(address)
    assert(Array.isArray(result))
    assert.equal(result.length, 2)
    assert.equal(expectedObject[0].currency, result[0].currency)
    assert.equal(expectedObject[0].amount.toString(), result[0].amount.toString())
    assert.equal(expectedObject[1].currency, result[1].currency)
    assert.equal(expectedObject[1].amount.toString(), result[1].amount.toString())
  })
})
