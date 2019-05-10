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
      const expectedSig = '0xea4cc4cce74857f43b46ab6d8a735a0d44a9ff39c6a165d6a390cd5db193265220ebc4430ade992b6197506a3ef2d0e65e97256fec423a7e17e3659c039a82321c'

      const typedData = transaction.getTypedData(txBody)
      const toSign = transaction.getToSignHash(typedData)
      const signatures = sign(toSign, [privateKey])
      assert.equal(signatures[0], expectedSig)
    })
  })
})
