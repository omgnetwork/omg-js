const newTransaction = require('./transaction/newTx')
const { hash, signature, zeroSignature, singleSign, signedEncode } = require('./transaction/signature')
const signatureDigest = require('./transaction/sigDigest')
const { rlpEncodeArr, ArrToUint8 } = require('./transaction/rlp')
const { base16Encode, base16Decode } = require('./transaction/base16')
const submitTx = require('./transaction/submitRPC');
const getUtxo = require('./transaction/getUtxo');
const depositEth = require('./deposit/depositEth')
const depositToken = require('./deposit/depositToken')
const getDepositBlock = require('./deposit/getDepositBlock')
const hexToByteArr = require('./helpers/hexToByteArr')
const byteArrToBuffer = require('./helpers/byteArrToBuffer')
global.Buffer = global.Buffer || require("buffer").Buffer;

/* 
*Summary: Interact with Tesuji Plasma Childchain from JavaScript (Node.js and Browser)
*Description: allows user to interact with Tesuji Plasma from JavaScript. look up examples for implementations in boith Client and Server
*
*@param {string} _watcherUrl contains the url of the watcher server 
*@param {string} _childChainUrl contains the url of the childchain server to communicate with
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

    /**
     * generate, sign, encode and submit transaction to childchain
     *
     * @method sendTransaction
     * @param {array} inputs
     * @param {array} currency
     * @param {array} outputs
     * @return {object} success/error message with `tx_index`, `tx_hash` and `blknum` params
     */

    this.sendTransaction = async (inputs, currency, outputs, privKey) => {
      try {
        //turns 2 hex addresses input to 2 arrays 
        outputs[0].newowner1 = Array.from(hexToByteArr(outputs[0].newowner1))
        outputs[1].newowner2 = Array.from(hexToByteArr(outputs[1].newowner2))
        //turn privkey string to addr
        privKey = byteArrToBuffer(hexToByteArr(privKey))
        //creates new transaction object
        let transactionBody = await newTransaction(inputs, currency, outputs);
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

    /**
     * Obtain UTXO of an address
     *
     * @method getUtxo
     * @param {String} address
     * @return {array} arrays of UTXOs
     */

    this.getUtxo = async (address) => {
      try {
        let utxos = await getUtxo(self.watcherUrl, address)
        return utxos
      } catch (err) {
        console.log(err)
      }
    }
    
    /**
     * Deposit ETH to Plasma contract
     *
     * @method depositEth
     * @param {String} fromAddr
     * @param {String} amount
     * @return {String} transaction hash of the deposited ETH
     */

    this.depositEth = async (amount, fromAddr) => {
      try{
        let depositedEth = await depositEth(amount, fromAddr, self.plasmaAddr, self.web3Provider)
        return depositedEth
      } catch (err) {
        console.log(err)
      }
    }
    
  /**
   * Deposit ERC20 Token to Plasma contract
   *
   * @method depositToken
   * @param {String} fromAddr
   * @param {String} tokenAddr
   * @param {String} amount
   * @return {String} transaction hash of the deposited Token
   */

    this.depositToken = async (fromAddr, tokenAddr, amount) => {
      try{
        let depositedToken = await depositToken(amount, self.plasmaAddr, fromAddr, tokenAddr, self.web3Provider)
        return depositedToken 
      } catch (err) {
        console.log(err)
      }
    }

    /**
     * get the block number of deposit ETH
     *
     * @method getDepositBlock
     * @param {String} txhash
     * @return {Number} block number of the deposited block
     */
    
    this.getDepositBlock = async (txhash) => {
      try{
        let gotDeposit = await getDepositBlock(txhash, self.web3Provider)
        return gotDeposit
      } catch (err) {
        console.log(err)
      }
    }
  }
}

module.exports = OMG;

