//get deposited block number
const abi = require('./plasmaAbi')

const getDepositBlock = async function (txhash, web3Provider) {
  try {
    let Web3 = require('web3');
    let web3 = new Web3(web3Provider)

    let blockNum = await web3.eth.getTransactionReceipt(txhash, function (e, receipt) {
      let encodedBlkNum = "0x" + receipt.logs[0].data.substring(66, 130)
      let blkNum = web3.eth.abi.decodeParameter("uint256", encodedBlkNum);
      return blkNum
    });

    return blockNum

  } catch (err) {
    console.log(err)
  }
}

module.exports = getDepositBlock



