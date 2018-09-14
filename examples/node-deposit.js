//example node app to run OMG.JS Library 
//You must have a Geth running with the specified account unlocked
//dont forget to retrieve the plasma addr before running

const alice = "0xdae49a8ea6554be551201ffd8e5d69a6f9186dbc"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", "childChainLocal", "http://localhost:8545", "0x733bf3b72381f4c8ae9b2952e6da36deb18297eb")

async function depositAndGetBlock(){
  let depositEth = await Omg.depositEth("10", alice)
  let blockNum = await Omg.getDepositBlock(depositEth)
}

depositAndGetBlock()

