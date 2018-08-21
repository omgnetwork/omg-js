//Main Transaction Function
const newTx = require('./transaction/newTx')
const { hash, signature, zeroSignature, singleSign, signedEncode } = require('./transaction/signature')
const signatureDigest = require('./transaction/sigDigest')
const { rlpEncodeArr, ArrToUint8 } = require('./transaction/rlp')
const { base16Encode, base16Decode } = require('./transaction/base16')
const submitTx = require('./transaction/submitRPC');

class OMG {
    constructor() {
        //'use strict';
        this.sendTransaction = async (url, inputs, currency, outputs, privKey) => {
            try {
                //creates new transaction object
                let transactionBody = await newTx(inputs, currency, outputs);
                //sign transaction
                let signedTx = await singleSign(transactionBody, privKey);
                //encode transaction with RLP
                let obj = signedTx.raw_tx;
                let rlpEncodedTransaction = await signedEncode(obj, signedTx.sig1, signedTx.sig2);
                //encode transaction with base16
                let base16 = await base16Encode(rlpEncodedTransaction);
                //submit via JSON RPC
                let submission =  submitTx(base16, url)
                return submission
            }
            catch (err) {
                console.log(err);
            }
        };
    }
}

/*
let Omg = new OMG()
  
Omg.sendTransaction("http://35.200.30.83:9656" , _inputs, _currency, _outputs, alicePriv)
*/

module.exports = OMG



