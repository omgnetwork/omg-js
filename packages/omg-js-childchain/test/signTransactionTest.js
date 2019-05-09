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
      const expectedSig = '0x171ee955e5d4ef68fd336fb2750a220276b3208b4bc13c66262b77aac99280ba48a6f35471b23b54f9a3299ea88dcadd4ca04bc71e188dcd957ab5da1f2927c61c'

      const typedData = transaction.getTypedData(txBody)
      const toSign = transaction.signHash(JSON.parse(typedData))
      const signatures = sign(toSign, [privateKey])
      assert.equal(signatures[0], expectedSig)
    })
  })
})
