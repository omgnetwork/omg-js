/*
* before running this function, make sure ERC20 token is created and approved
*
*/
const abi = require('./plasmaAbi')
const getTokenDepositBlock = require('./getTokenDepositBlock')
//deposit ERC20 Token
const depositToken = async function ( amount, plasmaAddr, fromAddr, tokenAddr, provider) {
  try {
    let Web3 = require('web3');
    let web3 = new Web3(provider)
    //let plasmaAbi = JSON.parse()                   
    plasmaContract = new web3.eth.Contract(abi.abi, plasmaAddr)
    //let addToken = await plasmaContract.methods.addToken(tokenAddr).encodeABI()
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

/*
WIP implementing deposit + get deposit block
*/

/* let _aliceAddress = "0x95d6c5cf598adbd58ce2e169cde751fc51109f8b"
let _plasmaAddress = "0x771fac262f96722a86bdb09eafac4d15b8952af3"
let _tokenAddress = "0x218017b5f7c3f1a58dde9e0b945d1e2e0df9d8ba"
                     
let _provider = "http://localhost:8545"

async function depositGetblock() {
  let tokenHash = await depositToken( 2, _plasmaAddress, _aliceAddress, _tokenAddress, _provider) 
  let blockNum = await getTokenDepositBlock(tokenHash, _provider)
}

depositGetblock() */
//module.exports = depositToken
