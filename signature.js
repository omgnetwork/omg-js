//generates signature

keccak256 = require('js-sha3').keccak256;
const ethUtil = require('eth-sig-util')
const signatureDigest = require('./sigDigest')
const { rlpEncodeArr, ArrToUint8 } = require('./rlp')

const hash = async (message) => {
    let hexValue = await keccak256(message)
    let bufferValue = new Buffer(hexValue, "hex")
    let uint8Value = new Uint8Array(bufferValue)
    console.log(uint8Value)
    return uint8Value
}


const signature = async (encodedTx, privateKey) => {
    //TODO: Add logic to add 0 to function without message inputs

    let hashedMsg = await hash(encodedTx);
    let signed = signatureDigest(hashedMsg, privateKey)
    let signedToArr = Array.from(signed)
    return signedToArr;
}

//for when there is encodedTx but, no privateKey available 
const zeroSignature = () => {
    let zeroBytes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    return zeroBytes
}

//sign transaction object
/*
Object Struct input
{
    amount1: 7,
    amount2: 3,
    blknum1: 66004001, 
    blknum2: 0,
    cur12: <<0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0>>,
    newowner1: <<116, 90, 78, 212,
      118, 51, 233, 165, 245, 155, 19,
      234, 50, 191, 20, 131, 178, 219,
      41, 65>>,
    newowner2: <<101, 166, 194, 146,
      88, 167, 6, 177, 55, 187, 239,
      105, 27, 233, 12, 165, 29, 47,
      182, 80>>,
    oindex1: 0,
    oindex2: 0,
    txindex1: 0,
    txindex2: 0
  }

  object struct OUTPUT
  {
    amount1: 7,
    amount2: 3,
    blknum1: 66004001,
    blknum2: 0,
    cur12: <<0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0>>,
    newowner1: <<116, 90, 78, 212,
      118, 51, 233, 165, 245, 155,
      19, 234, 50, 191, 20, 131,
      178, 219, 41, 65>>,
    newowner2: <<101, 166, 194, 146,
      88, 167, 6, 177, 55, 187, 239,
      105, 27, 233, 12, 165, 29, 47,
      182, 80>>,
    oindex1: 0,
    oindex2: 0,
    txindex1: 0, 
    txindex2: 0
  },
  sig1: [172, 240, 111, 235, 159, 24, 36, 208, 125, 144, 104, 77, 164, 187, 181, 212,
  19, 5, 40, 73, 213, 194, 57, 209, 146, 191, 98, 62, 203, 125, 158, 141, 118,
  214, 78, 154, 41, 123, 146, 31, 111, 9, 176, 123, 237, 1, 226, 211, 252, 139,
  105, 166, 27, 173, 5, 20, 125, 74, 151, 30, 163, 125, 238, 27, 28],
  sig2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  signed_tx_bytes: [248, 209, 132, 3, 239, 36, 33, 128, 128, 128, 128, 128, 148, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 148, 116, 90, 78, 212, 118, 51, 233,
  165, 245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65, 7, 148, 101, 166,
  194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182,
  80, 3, 184, 65, 172, 240, 111, 235, 159, 24, 36, 208, 125, 144, 104, 77, 164, 
  187, 181, 212, 19, 5, 40, 73, 213, 194, 57, 209, 146, 191, 98, 62, 203, 125,
  158, 141, 118, 214, 78, 154, 41, 123, 146, 31, 111, 9, 176, 123, 237, 1, 226,
  211, 252, 139, 105, 166, 27, 173, 5, 20, 125, 74, 151, 30, 163, 125, 238, 27,
  28, 184, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}
  */

 

//
const signedEncode = async (tx, sig1, sig2) => {
    let transactionBody = [
        tx.blknum1,
        tx.txindex1,
        tx.oindex1,
        tx.blknum2,
        tx.txindex2,
        tx.oindex2,
        tx.cur12,
        tx.newowner1,
        tx.amount1,
        tx.newowner2,
        tx.amount2,
        sig1,
        sig2
    ]

    let rlpEncoded = await rlpEncodeArr(transactionBody)
    return rlpEncoded
    
}


const singleSign = async (tx, priv1) => {
    //transform tx into array format
    let txArray =  
    [
        tx.blknum1,
        tx.txindex1,
        tx.oindex1,
        tx.blknum2,
        tx.txindex2,
        tx.oindex2,
        tx.cur12,
        tx.newowner1,
        tx.amount1,
        tx.newowner2,
        tx.amount2
    ]
    //encode tx array
    let encodedTx = await rlpEncodeArr(txArray)    
    //generate first signature (signature function)
    let sig1 = await signature(encodedTx, priv1)
    //generate second signature (zero signature function)
    let sig2 = await zeroSignature()
    //generate signed_tx_bytes (with another Signed.encode function)
    let signed_tx_bytes = await signedEncode(tx, sig1, sig2)
    //putting it all together and return the object
    let signedTransaction = {
        raw_tx: tx,
        sig1,
        sig2,
        signed_tx_bytes
    }
    
    return signedTransaction
}



module.exports = {signature, hash, signedEncode, zeroSignature, singleSign}
