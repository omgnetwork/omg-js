// example node app to run OMG.JS Library
// You must have a Geth running with the specified account unlocked
// dont forget to retrieve the plasma addr before running

const alice = '0x3b9d59efb13029ad2873ab500c689d20707f76bc'

const OMG = require('../omg')
const Omg = new OMG('watcher_url', 'childChainLocal', 'http://localhost:8545', '0x49a3565c825fb94371b14a5172c48b041b263668')

async function depositAndGetBlock () {
  let depositEth = await Omg.depositEth(2, alice)
  let blockNum = await Omg.getDepositBlock(depositEth)
  return blockNum
}

depositAndGetBlock()
