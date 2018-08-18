const { hash, signature } = require('../signature')
var assert = require('assert')

const hashedTx =
new Uint8Array([41, 144, 16, 100, 71, 248, 218, 223, 141, 45, 112, 193, 233, 207, 77, 182, 81,
    153, 105, 181, 171, 62, 167, 202, 94, 82, 96, 151, 227, 31, 188, 58])

let signedTX = new Uint8Array([179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 233, 97, 238, 18, 136, 144, 102, 46, 27, 27, 197, 86, 235, 175, 57, 173, 215, 8, 187, 44, 27])

const txInput =
new Uint8Array([141, 71, 59, 252, 39, 243, 159, 15, 219, 218, 102, 12, 86, 193, 183, 238, 72,
    224, 70, 252, 26, 46, 111, 176, 96, 198, 135, 5, 51, 164, 225, 234, 124, 176,
    154, 37, 151, 221, 232, 225, 107, 149, 50, 243, 63, 178, 96, 109, 176, 28, 48,
    135, 224, 35, 140, 220, 191, 244, 40, 136, 229, 155, 174, 223, 27])

let alicePriv = Buffer.from( new Uint8Array([165, 253, 5, 87, 255, 90, 198, 97, 236, 75, 74, 205, 119, 102, 148, 243, 213, 102, 3, 104, 36, 251, 206, 152, 50, 114, 92, 65, 154, 84, 48, 47]))

describe('signature', () => {
    it('should hash a message', async () => {
        let hashed = await hash(txInput);
        assert.deepEqual(hashed, hashedTx)
    });
    it('should sign correct signature', async () => {
        let signed = await signature(txInput, alicePriv);
        assert.deepEqual(signedTX,signed)
    })
})