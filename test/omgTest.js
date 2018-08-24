const OMG = require('../omg')
var assert = require('assert')
const chai = require('chai');
const expect = chai.expect;

//This test assumes that the E
//Arguements for Omg.sendTransaction() function 

let childChainPort = "http://35.200.30.83:9656"

let alicePriv = Buffer.from( new Uint8Array([165, 253, 5, 87, 255, 90, 198, 97, 236, 75, 74, 205, 119, 102, 148, 243, 213, 102, 3, 104, 36, 251, 206, 152, 50, 114, 92, 65, 154, 84, 48, 47]))

const amount1 = 7
const amount2 = 3
const blknum1 = 66004001
const blknum2 = 0
const oindex1 = 0
const oindex2 = 0
const txindex1 = 0
const txindex2 = 0
const cur12 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

//const newowner1 = [116, 90, 78, 212, 118, 51, 233, 165, 245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65]
const newowner1 = "0x745a4ed47633e9a5f59b13ea32bf1483b2db2941"
//const newowner2 = [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80]
const newowner2 = "0x65a6c29258a706b137bbef691be90ca51d2fb650"
const _inputs = [{blknum1, txindex1, oindex1}]

const _currency = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const _outputs = [{newowner1, amount1},{newowner2, amount2}]

const expectedReturn = { 
    jsonrpc: '2.0',
    id: 0,
    error: { 
        message: 'Internal error', 
        data: "utxo_not_found",
        code: -32603 
    } 
}

const Omg = new OMG(childChainPort)

//Declaring as Omg as OMG
describe('calls OMG functions', () => {
    it('should generate, sign, encode and submit transaction', async () => {
            let sentTransaction = await Omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)
            assert.deepEqual(sentTransaction, expectedReturn)
    
    })
})