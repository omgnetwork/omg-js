/*
* Deposit ERC20 Token
* before running this function, make sure ERC20 token is created to fromAddr and approved for plasmaAddr
*
*/

const Web3 = require('web3');
const web3 = new Web3(provider)
const abi = require('./plasmaAbi')

const depositToken = async function ( amount, plasmaAddr, fromAddr, tokenAddr, provider) {
  try {
    
    const plasmaContract = new web3.eth.Contract(abi.abi, plasmaAddr)
    let depositData = plasmaContract.methods.depositFrom(fromAddr, tokenAddr, amount).encodeABI()
    console.log(depositData)
    let txHash = await web3.eth.sendTransaction({
      from: fromAddr,
      to: plasmaAddr,
      data: depositData
    })  
    
    console.log(txHash)
    return txHash.transactionHash 

  } catch (err) {
    console.log(err)
  }
}

