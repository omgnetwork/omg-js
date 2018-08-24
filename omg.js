//Main Transaction Function
const newTx = require('./transaction/newTx')
const { hash, signature, zeroSignature, singleSign, signedEncode } = require('./transaction/signature')
const signatureDigest = require('./transaction/sigDigest')
const { rlpEncodeArr, ArrToUint8 } = require('./transaction/rlp')
const { base16Encode, base16Decode } = require('./transaction/base16')
const submitTx = require('./transaction/submitRPC');
const hexToByteArr = require('./helpers/hexToByteArr')
global.Buffer = global.Buffer || require("buffer").Buffer;


class OMG {
    constructor(childChainUrl) {
        let url = childChainUrl

        this.sendTransaction = async (inputs, currency, outputs, privKey) => {
            try {
                //turns 2 hex addresses inputs to 2 arrays
                outputs[0].newowner1 = await Array.from(hexToByteArr(outputs[0].newowner1 ))
                outputs[1].newowner2 = await Array.from(hexToByteArr(outputs[1].newowner2 ))
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

//to export Class for Browserify
//global.Omg = OMG;
//to Export Class for React
//export default OMG
//to Run in Node.js
module.exports = OMG;

