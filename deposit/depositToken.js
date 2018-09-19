/*
* Deposit ERC20 Token
* before running this function, make sure ERC20 token is created to fromAddr and approved for plasmaAddr
*
*/
const abi = require('./plasmaAbi')
const depositToken = async function ( amount, plasmaAddr, fromAddr, tokenAddr, provider) {
  try {
    let Web3 = require('web3');
    let web3 = new Web3(provider)
    plasmaContract = new web3.eth.Contract(abi.abi, plasmaAddr)
    let depositData = await plasmaContract.methods.depositFrom(fromAddr, tokenAddr, amount).encodeABI()
    console.log(depositData)
    let txHash = await web3.eth.sendTransaction({
      from: fromAddr,
      to: plasmaAddr,
      data: depositData,
      gas: 303788
    })  
    
    console.log(txHash)
    return txHash.transactionHash 

  } catch (err) {
    console.log(err)
  }
}

