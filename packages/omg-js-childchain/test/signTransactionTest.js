const { sign, transaction } = require('@omisego/omg-js-util')
const assert = require('chai').assert

describe('signTransaction', function () {
  describe('signTransaction', function () {
    it('should sign the entire transaction object correctly', function () {
      const txBody = {
        txType: 1,
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
        ],
        txData: 0
      }

      const privateKey = 'a07cb7889ab3a164dcc72cb6103f2573c7ef2d4a855810594d2bf25df60bc39e'
      const expectedSig = '0x0533fe81a1ad27564475bd43c12c138633b6bf74dcf58ae2efd158ed4d3982483e49c34c82c74612c1d920fc22aff19936f91f1c90941b6f7338d8561420313a1b'
      const verifyingContract = '0xecda6da8fddd416837bdcf38d6e17a4a898534eb'

      const typedData = transaction.getTypedData(txBody, verifyingContract)
      const toSign = transaction.getToSignHash(typedData)
      const signatures = sign(toSign, [privateKey])
      assert.equal(signatures[0], expectedSig)
    })
  })
})
