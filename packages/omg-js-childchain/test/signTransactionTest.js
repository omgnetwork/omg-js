const { sign, transaction } = require('@omisego/omg-js-util')
const assert = require('chai').assert

describe('signTransaction', function () {
  describe('signTransaction', function () {
    it('should sign the entire transaction object correctly', function () {
      const txBody = {
        inputs: [
          {
            amount: 5555431,
            blknum: 2000,
            currency: '0x0000000000000000000000000000000000000000',
            oindex: 1,
            owner: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            txindex: 0,
            utxo_pos: 2000000000001
          }
        ],
        outputs: [
          {
            outputType: 1,
            outputGuard: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 123
          },
          {
            outputType: 1,
            outputGuard: '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            currency: '0x0000000000000000000000000000000000000000',
            amount: 5555308
          }
        ]
      }

      const privateKey = 'a07cb7889ab3a164dcc72cb6103f2573c7ef2d4a855810594d2bf25df60bc39e'
      const expectedSig = '0xee1c008e7d50b23ed3fc2d325c25f9f7be8667e6557561ec988cc1b8dc5c5b584626454b3b433b5a18ac36ad430b4ba982ab426069ac7136f757b7c5d8661cab1b'
      const verifyingContract = '0xecda6da8fddd416837bdcf38d6e17a4a898534eb'

      const typedData = transaction.getTypedData(txBody, verifyingContract)
      const toSign = transaction.getToSignHash(typedData)
      const signatures = sign(toSign, [privateKey])
      assert.equal(signatures[0], expectedSig)
    })
  })
})
