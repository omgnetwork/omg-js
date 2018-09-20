/*
* get the deposited block number based on txHash
*
*/

const getDepositBlock = async function (txhash, web3Provider) {
  let Web3 = require('web3');
  let web3 = new Web3(web3Provider)

  let blockReceipt = await web3.eth.getTransactionReceipt(txhash, function (e, receipt) {
    return receipt
  });

  let encodedBlkNum = "0x" + blockReceipt.logs[0].data.substring(66, 130)
  let blkNum = Number(web3.eth.abi.decodeParameter("uint256", encodedBlkNum))
  console.log(blkNum)

  return blkNum
}

module.exports = getDepositBlock
