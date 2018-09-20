/*
* Deposit ETH
*
*/

const Web3 = require('web3');
const web3 = new Web3(web3Provider)

const depositEth = async function (amount, fromAddr, contractAddr, web3Provider) {
  try {
    
    let stringAmount = amount.toString()

    let txHash = await web3.eth.sendTransaction({
      from: fromAddr,
      to: contractAddr,
      value: web3.utils.toWei(stringAmount, 'ether'),
      data: '0xd0e30db0'
    })
    .on('transactionHash', function(hash){
      console.log(hash)
      return hash
    })

    return txHash.transactionHash

  } catch (err) {
    console.log(err)
  }
}

module.exports = depositEth
