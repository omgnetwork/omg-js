const { sign, transaction } = require('@omisego/omg-js-util')
const assert = require('chai').assert

describe('signTransaction', () => {
  describe('signTransaction', () => {
    it('should sign the entire transaction object correctly', () => {
      const txBody = {
        'inputs': [
          {
            'amount': 5555431,
            'blknum': 2000,
            'currency': '0x0000000000000000000000000000000000000000',
            'oindex': 1,
            'owner': '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            'txindex': 0,
            'utxo_pos': 2000000000001
          }
        ],
        'outputs': [
          {
            'owner': '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            'currency': '0x0000000000000000000000000000000000000000',
            'amount': 123
          },
          {
            'owner': '0xf86b5b1c2c8de1ea4dc737c849272340fa3561c5',
            'currency': '0x0000000000000000000000000000000000000000',
            'amount': 5555308
          }
        ]
      }

      const privateKey = 'a07cb7889ab3a164dcc72cb6103f2573c7ef2d4a855810594d2bf25df60bc39e'
      const expectedSig = '0xed0ff5633cb85aa0f64684759185f8a9f94fd1b654be5942d562bf64f504e3a96a83b90a5e50e50b8a75d4f711d1c0e56066519237dbd94e564084a561b8ba2f1b'
      const verifyingContract = '0xecda6da8fddd416837bdcf38d6e17a4a898534eb'

      const typedData = transaction.getTypedData(txBody, verifyingContract)
      const toSign = transaction.getToSignHash(typedData)
      const signatures = sign(toSign, [privateKey])
      assert.equal(signatures[0], expectedSig)
    })
  })
})
