//example node app to run OMG.JS Library 
//You must have a Geth running with the specified account unlocked
//dont forget to retrieve the plasma addr before running

let gethRpc = "http://localhost:8545"

const alice = "0x25d274f6ec8a14bba45de2b4581203e65f8a9060"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", "childChainLocal", "http://localhost:8545", "0x96f770ffab0b6094c52135a6129f4d2bb5089f83")

async function depositAndGetBlock(){
  const depositEth = require('../deposit/depositEth')
  let deposited = await depositEth("1", "0x25d274f6ec8a14bba45de2b4581203e65f8a9060", "0x96f770ffab0b6094c52135a6129f4d2bb5089f83","http://localhost:8545")
  let blockNum = await Omg.getDepositBlock(deposited)
}

depositAndGetBlock()
