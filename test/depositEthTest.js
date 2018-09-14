//testing ETH function
const assert = require('assert')
const depositEth = require('../deposit/depositEth')
const chai = require('chai');
const expect = chai.expect;

describe('deposit ETH function', () => {
  it('should return txhash', async () => {
    let amount = "10"
    let fromAddr = "0x2eac736d6f0d71d3e51345417a5b205bfa4748a8"
    let contractAddr = "0x733bf3b72381f4c8ae9b2952e6da36deb18297eb"
    let provider = "http://localhost:8546"
    let obj = await depositEth(amount, fromAddr, contractAddr, provider)
    assert.strictEqual(obj, undefined)
  })
})