
const Web3Eth = require('web3-eth')
const Web3Utils = require('web3-utils')
const plasmaAbi = require('./plasmaAbi')
const debug = require('debug')('omg.rootchain')

class RootChain {
  constructor (web3Provider) {
    this.eth = new Web3Eth(web3Provider)
  }

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
