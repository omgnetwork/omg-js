
const Web3Eth = require('web3-eth')
const Web3Utils = require('web3-utils')
const plasmaAbi = require('./plasmaAbi')
const debug = require('debug')('omg.rootchain')

class RootChain {

  /**
  *Summary: Interact with Tesuji Plasma Rootchain from JavaScript (Node.js and Browser)
  *Description: allows user to interact with Tesuji Plasma Rootchain (Ethereum) from JavaScript.
  *
  *@param {string} web3Provider contains the url of the watcher server
  *
  */
  constructor (web3Provider) {
    this.eth = new Web3Eth(web3Provider)
  }
  /**
   * deposit ETH to rootchain
   *
   * @method depositEth
   * @param {number} amount amount of ETH to deposit
   * @param {string} fromAddress address to make the deposit from
   * @param {string} plasmaContractAddress address of the plasma contract
   * @return {string} transaction Hash of the deposit
   */
  async depositEth (amount, fromAddress, plasmaContractAddress) {
    const receipt = await this.eth.sendTransaction({
      from: fromAddress,
      to: plasmaContractAddress,
      value: Web3Utils.toWei(amount.toString(), 'ether'),
      data: '0xd0e30db0' // TODO What's this data for?
    })
    debug(`deposit receipt: ${receipt}`)
    debug(`returned transaction hash: ${receipt.transactionHash}`)
    return receipt.transactionHash
  }

   /**
   * deposit Token to rootchain
   *
   * @method depositToken
   * @param {number} amount amount of ETH to deposit
   * @param {string} plasmaContractAddress address of the plasma contract
   * @param {string} fromAddress address to make the deposit from
   * @param {string} tokenAddress address of the ERC20 Token
   * @return {string} transaction Hash of the deposit
   */

  async depositToken (amount, plasmaContractAddress, fromAddress, tokenAddress) {
    const plasmaContract = new this.eth.Contract(plasmaAbi.abi, plasmaContractAddress)
    const depositData = plasmaContract.methods.depositFrom(fromAddress, tokenAddress, amount).encodeABI()
    const receipt = await this.eth.sendTransaction({
      from: fromAddress,
      to: plasmaContractAddress,
      data: depositData
    })

    debug(`depositToken receipt: ${receipt}`)
    debug(`depositToken transaction hash: ${receipt.transactionHash}`)
    return receipt.transactionHash
  }

  /**
   * get the block number of the deposit in the childchain
   *
   * @method getDepositBlock
   * @param {string} txhash transaction hash
   * @return {number} block number of the deposit inside the childchain
   */

  async getDepositBlock (txhash) {
    const receipt = await this.eth.getTransactionReceipt(txhash)
    if (!receipt) {
      console.error(`Error - no transaction receipt found for ${txhash}`)
      return null
    }
    let encodedBlkNum = receipt.logs[0].topics[2]
    debug(`encoded block number: ${encodedBlkNum}`)
    return Number(this.eth.abi.decodeParameter('uint256', encodedBlkNum))
  }
}

module.exports = RootChain
