//example node app to run OMG.JS Library 
//You must have a Geth running with the specified account unlocked
//dont forget to retrieve the plasma addr before running

let gethRpc = "http://localhost:8545"

const alice = "0x2eac736d6f0d71d3e51345417a5b205bfa4748a8"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", "childChainLocal", "http://localhost:8545", "0x733bf3b72381f4c8ae9b2952e6da36deb18297eb")

async function depositAndGetBlock(){
  //const depositEth = require('../deposit/depositEth')
  //let deposited = await depositEth("1", alice, "0x733bf3b72381f4c8ae9b2952e6da36deb18297eb","http://localhost:8545")
  let depositEth = await Omg.depositEth("10", alice)
  let blockNum = await Omg.getDepositBlock(depositEth)
}

depositAndGetBlock()

