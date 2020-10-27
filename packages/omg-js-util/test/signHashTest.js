const { transaction, hashTypedDataMessage, getDomainSeperatorHash } = require('../src')
const assert = require('chai').assert

const verifyingContract = '0xecda6da8fddd416837bdcf38d6e17a4a898534eb'
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

const typedData = transaction.getTypedData(txBody, verifyingContract)

describe('hashTypedDataMessage', function () {
  it('should hash typed data message correctly', function () {
    assert.equal(hashTypedDataMessage(typedData), '0xbbfceed8e6b34851dfacdeef46dce4ec9e14fec48c3ad5a15d5b3efc2d6f2b0e')
  })
})

describe('getDomainSeperatorHash', function () {
  it('should get domain seperator hash correctly', function () {
    assert.equal(getDomainSeperatorHash(typedData), '0x6c650db4cf8537eca556551a536134f12df128b0628180c031ec65cdb08e6295')
  })
})
