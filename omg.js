const newTx = require('./transaction/newTx')
const { hash, signature, zeroSignature, singleSign, signedEncode } = require('./transaction/signature')
const signatureDigest = require('./transaction/sigDigest')
const { rlpEncodeArr, ArrToUint8 } = require('./transaction/rlp')
const { base16Encode, base16Decode } = require('./transaction/base16')
const submitTx = require('./transaction/submitRPC');
const getUtxo = require('./transaction/getUtxo');
const hexToByteArr = require('./helpers/hexToByteArr')
const byteArrToBuffer = require('./helpers/byteArrToBuffer')
global.Buffer = global.Buffer || require("buffer").Buffer;

/* 
*Summary: Interact with Tesuji Plasma Childchain from JavaScript (Node.js and Browser)
*Description: allows user to interact with Tesuji Plasma from JavaScript. look up examples for implementations in boith Client and Server
*
*@param {string} _childChainUrl contains the url of the childchain server to communicate with
*@param {string} _watcherUrl contains the url of the watcher server 
*@param {string} _web3Provider contains the url of geth node
*@param {string} _plasmaAddr contains the url of the plasma smart contract already deployed
*
*/

class OMG {
  constructor(_watcherUrl, _childChainUrl, _web3Provider, _plasmaAddr) {
    this.watcherUrl = _watcherUrl
    this.childChainUrl = _childChainUrl
    this.web3Provider = _web3Provider
    this.plasmaAddr = _plasmaAddr
    let self = this
    /*
    @params {array} inputs 
    @params {array} currency
    @params {array} outputs
    @params {string} privKey private key of the transaction Signer 
    */

    this.sendTransaction = async (inputs, currency, outputs, privKey) => {
      try {
        //turns 2 hex addresses input to 2 arrays 
        outputs[0].newowner1 = await Array.from(hexToByteArr(outputs[0].newowner1))
        outputs[1].newowner2 = await Array.from(hexToByteArr(outputs[1].newowner2))
        //turn privkey string to addr
        privKey = await byteArrToBuffer(hexToByteArr(privKey))
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
        let submission = submitTx(base16, self.childChainUrl)
        return submission
      }
      catch (err) {
        console.log(err);
      }
    };

    this.getUtxo = async (address) => {
      try {
        let gotUtxo = getUtxo(self.watcherUrl, address)
        return gotUtxo
      } catch (err) {
        console.log(err)
      }
    }
  }
}

//to Export Class for React
//export default OMG
//to Run in Node.js
module.exports = OMG;

