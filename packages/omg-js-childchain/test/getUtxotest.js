const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const assert = require('chai').assert
const getUtxo = require('../src/transaction/getUtxo')
const nock = require('nock')

let watcherUrl = 'http://omg-watcher'
let address = '0xd72afdfa06ae5857a639051444f7608fea1528d4'

const expectedObject = {
  'utxos': [],
  'address': '0xd72afdfa06ae5857a639051444f7608fea1528d4'
}

describe('it should get utxo of an address', () => {
  it('should return object with empty array as utxo with an address', async () => {
    let utxoStore = nock('http://omg-watcher')
      .get('/account/utxo?address=0xd72afdfa06ae5857a639051444f7608fea1528d4')
      .reply(200, expectedObject)
    console.log(utxoStore)
    let returnUtxo = await getUtxo(watcherUrl, address)
    assert.deepEqual(expectedObject, returnUtxo)
  })
})
