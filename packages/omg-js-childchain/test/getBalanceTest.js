const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const ChildChain = require('../src')
const nock = require('nock')

chai.use(chaiAsPromised)
const assert = chai.assert

const watcherUrl = 'http://omg-watcher'

describe('getBalance', () => {
  it('should return object with empty array as utxo with an address', async () => {
    const address = '0xd72afdfa06ae5857a639051444f7608fea1528d4'
    const expectedObject = [{
      currency: '00000000000000000000',
      balance: 1000000000000000000
    }]

    nock(watcherUrl)
      .get(`/account/${address}/balance`)
      .reply(200, { result: 'success', data: expectedObject })

    const childChain = new ChildChain(watcherUrl, '')
    const result = await childChain.getBalance(address)
    assert(Array.isArray(result))
    assert.equal(result.length, 1)
    assert.equal(expectedObject[0].currency, result[0].currency)
    assert.equal(expectedObject[0].balance.toString(), result[0].balance.toString())
  })

  it('should throw an error on failure', async () => {
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
})
