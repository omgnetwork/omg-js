const ChildChain = require('../src/index')
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const assert = require('chai').assert
const nock = require('nock')

let childChainPort = 'http://omg-childchain.co'

let alicePriv = '0xa5fd0557ff5ac661ec4b4acd776694f3d566036824fbce9832725c419a54302f'

const amount1 = 7
const amount2 = 3
const blknum1 = 66004001
const blknum2 = 0
const oindex1 = 0
const oindex2 = 0
const txindex1 = 0
const txindex2 = 0

const newowner1 = '0x745a4ed47633e9a5f59b13ea32bf1483b2db2941'
const newowner2 = '0x65a6c29258a706b137bbef691be90ca51d2fb650'
const _inputs = [{ blknum1, txindex1, oindex1 }, { blknum2, txindex2, oindex2 }]

const _currency = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const _outputs = [{ newowner1, amount1 }, { newowner2, amount2 }]

const expectedReturn = {
  jsonrpc: '2.0',
  id: 0,
  error: {
    message: 'Internal error',
    code: -32603
  }
}

const childChain = new ChildChain('watcher_url', childChainPort, 'web3_provider', 'plasma_addr')

describe('sendTransaction', () => {
  it('should generate, sign, encode and submit transaction', async () => {
    nock('http://omg-childchain.co')
      .post('/')
      .reply(200, expectedReturn)
    let sentTransaction = await childChain.sendTransaction(_inputs, _currency, _outputs, alicePriv)
    assert.deepEqual(sentTransaction, expectedReturn)
  })
})
