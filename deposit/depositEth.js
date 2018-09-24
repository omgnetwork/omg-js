/*
* Deposit ETH
*
*/

const Web3 = require('web3');

const depositEth = async function (amount, fromAddr, contractAddr, web3Provider) {
  const web3 = new Web3(web3Provider)
  let stringAmount = amount.toString()

  let txHash = await web3.eth.sendTransaction({
    from: fromAddr,
    to: contractAddr,
    value: web3.utils.toWei(stringAmount, 'ether'),
    data: '0xd0e30db0'
  })
    .on('transactionHash', function (hash) {
      console.log(hash)
      return hash
    })

  return txHash.transactionHash
}

module.exports = depositEth
