const abi = require('./plasmaAbi')
const getDepositBlock = require('./getDepositBlock')
//deposit ERC20 Token
const depositToken = async function () {
  try {
    let Web3 = require('web3');
    let web3 = new Web3('http://localhost:8545')
    //let plasmaAbi = JSON.parse()                   
    plasmaContract = new web3.eth.Contract(abi.abi, "0x49a3565c825fb94371b14a5172c48b041b263668")
    let depositData = await plasmaContract.methods.depositFrom("0x3b9d59efb13029ad2873ab500c689d20707f76bc", "0x7e963b0f1033203d5add032690ab43d64f5c7002", 5).encodeABI()//.send({from: "0xef2d8b6f11fe56a81f800d471acc3b951cbbae5f"}).
    /* .on('transactionHash', function(hash){
      console.log(hash)
    }) */
    console.log(depositData)
    /* .on('transactionHash', function(hash){
      console.log(hash)
      return hash
    })   */
    //send deposit transaction
     let txHash = await web3.eth.sendTransaction({
      from: "0x3b9d59efb13029ad2873ab500c689d20707f76bc",
      to: "0x49a3565c825fb94371b14a5172c48b041b263668",
      data: depositData,
      gas: 103788
    }) 
    
    console.log(txHash)
    return txHash.transactionHash

  } catch (err) {
    console.log(err)
  }
}

let aliceAddress = "0x3b9d59efb13029ad2873ab500c689d20707f76bc"
let plasmaAddress = "0x49a3565c825fb94371b14a5172c48b041b263668"
let tokenAddress = "0x7e963b0f1033203d5add032690ab43d64f5c7002"

async function depositGetblock() {
  let tokenHash = await depositToken() 
  let blockNum = await getDepositBlock("0x062c6fb8da02fe0d4669af759815d8046d15967f7e29a00b3957df1d639d9797", "http://localhost:8545")
}

depositGetblock()
//module.exports = depositToken
//