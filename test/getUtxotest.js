const getUtxo = require('../transaction/getUtxo')
var assert = require('assert')
const chai = require('chai');
const expect = chai.expect;

let watcherUrl = "http://localhost:4000"
let address = "0xd72afdfa06ae5857a639051444f7608fea1528d4"

const expectedObject = {
    "utxos": [],
    "address": "0xd72afdfa06ae5857a639051444f7608fea1528d4"
}

describe('it should get utxo of an address', () => {
    it('should return object with empty array as utxo with an address', async () => {
        let returnUtxo = await getUtxo(watcherUrl, address)
        assert.deepEqual(expectedObject, returnUtxo)
    })
}) 