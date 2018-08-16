const hash = require('../signature')
var assert = require('assert')

const hashedTx =
new Uint8Array([41, 144, 16, 100, 71, 248, 218, 223, 141, 45, 112, 193, 233, 207, 77, 182, 81,
    153, 105, 181, 171, 62, 167, 202, 94, 82, 96, 151, 227, 31, 188, 58])

const txInput =
new Uint8Array([141, 71, 59, 252, 39, 243, 159, 15, 219, 218, 102, 12, 86, 193, 183, 238, 72,
    224, 70, 252, 26, 46, 111, 176, 96, 198, 135, 5, 51, 164, 225, 234, 124, 176,
    154, 37, 151, 221, 232, 225, 107, 149, 50, 243, 63, 178, 96, 109, 176, 28, 48,
    135, 224, 35, 140, 220, 191, 244, 40, 136, 229, 155, 174, 223, 27])

describe('signature', () => {
    it('should hash a message', async () => {
        let hashed = await hash(txInput);
        assert.deepEqual(hashed, hashedTx)
    })
})