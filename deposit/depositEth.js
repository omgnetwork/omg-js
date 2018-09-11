//handles deposit
//caveats: you must have Geth account unlocked
const abi = require('./plasmaAbi')

const depositEth = async function (amount, fromAddr, contractAddr, web3Provider) {
  try {
    let Web3 = require('web3');
    let web3 = new Web3(web3Provider)

    let plasmaContract = new web3.eth.Contract(abi.abi, contractAddr, {
      from: web3.eth.accounts[1]
    });

    let txHash = await plasmaContract.methods.deposit().send({ from: fromAddr, value: web3.utils.toWei(amount, 'ether')})
    .on('transactionHash', function(transactionHash){
      console.log(transactionHash)
      return transactionHash
    })

    return txHash

  } catch (err) {
    console.log(err)
  }
}

module.exports = depositEth

