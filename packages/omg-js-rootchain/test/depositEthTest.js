// testing ETH function
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const chai = require('chai')
const expect = chai.expect
const RootChain = require('../src/index')

describe('deposit ETH function', () => {
  it('should throw a web3 error on invalid provider', async () => {
    let provider = 'http://localhost:8546'
    const rootChain = new RootChain(provider)

    let amount = 10
    let fromAddr = '0x2eac736d6f0d71d3e51345417a5b205bfa4748a8'
    let contractAddr = '0x733bf3b72381f4c8ae9b2952e6da36deb18297eb'
    let thrownError = new Error('Invalid JSON RPC response: ""')
    try {
      await rootChain.depositEth(amount, fromAddr, contractAddr)
    } catch (err) {
      expect(err).to.contain(thrownError)
    }
  })
})
