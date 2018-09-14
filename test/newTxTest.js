const assert = require('assert')
const newTx = require('../transaction/newTx')
const sampleTx = {
    amount1: 7,
    amount2: 3,
    blknum1: 66004001,
    blknum2: 0,
    cur12: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0],
    newowner1: [116, 90, 78, 212, 118, 51, 233, 165, 245, 155,
      19, 234, 50, 191, 20, 131, 178, 219, 41, 65],
    newowner2: [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80],
    oindex1: 0,
    oindex2: 0,
    txindex1: 0,
    txindex2: 0
} 

//tx inputs

const amount1 = 7
const amount2 = 3
const blknum1 = 66004001
const blknum2 = 0
const oindex1 = 0
const oindex2 = 0
const txindex1 = 0
const txindex2 = 0
const cur12 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const newowner1 = [116, 90, 78, 212, 118, 51, 233, 165, 245, 155,
    19, 234, 50, 191, 20, 131, 178, 219, 41, 65]
const newowner2 = [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80]

const inputs = [{blknum1, txindex1, oindex1},{blknum2, txindex2, oindex2}]

const currency = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const outputs = [{newowner1, amount1},{newowner2, amount2}]

describe('New Transaction', () => {
    it('should generate new transaction object', async () => {
        let generatedTx = newTx(inputs, currency, outputs)
        assert.deepEqual(sampleTx, generatedTx)
    })
})
