//Test for RLP Encode function
//Test Case based on Demo1 in omg repo


const { rlpEncodeArr, ArrToUint8 } = require('../transaction/rlp')
const byteArrToBuffer = require('../helpers/byteArrToBuffer')
var assert = require('assert')

/*dummy data*/ 
//this does not have signature

const inputRaw =
[
    263001,
    0,
    0,
    0,
    0,
    0,
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [116, 90, 78, 212, 118, 51, 233, 165, 245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65],
    7,
    [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80],
    3
]

const txRlpEncoded = 
[
    248, 74, 131, 4, 3, 89, 128, 128, 128, 128, 128, 148, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 148, 116, 90, 78, 212, 118, 51, 233, 165,
    245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65, 7, 148, 101, 166, 194,
    146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80,
    3
]

describe('should handle RLP conversions', () => {

    it('should RLP encode', async () => {
        let rlpEncoded = await rlpEncodeArr(inputRaw)
        assert.deepEqual(rlpEncoded, txRlpEncoded)
    })
    
})