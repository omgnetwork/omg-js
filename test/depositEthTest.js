// testing ETH function
const assert = require('assert')
const depositEth = require('../deposit/depositEth')
const chai = require('chai')
const expect = chai.expect

describe('deposit ETH function', () => {
  it('should throw a web3 error on invalid provider', async () => {
    let amount = 10
    let fromAddr = '0x2eac736d6f0d71d3e51345417a5b205bfa4748a8'
    let contractAddr = '0x733bf3b72381f4c8ae9b2952e6da36deb18297eb'
    let provider = 'http://localhost:8546'
    let thrownError = new Error('Invalid JSON RPC response: ""')
    try {
      await depositEth(amount, fromAddr, contractAddr, provider)
    } catch (err) {
      expect(err).to.contain(thrownError);
    }
    
  })
})
