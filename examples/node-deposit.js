//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps
//You must have a Geth running with the specified account unlocked
//dont forget to retrieve the plasma addr before running

let gethRpc = "http://localhost:8545"

const alice = "0xf26dc2b4f928ca140e340ad3e40d8d33655f6f81"
//const alicePriv = "0xe0f4fdaafb613e2b3000d1ecd7682beedd3dcd81acfdf975728e836f5a378b2e"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", "childChainLocal", "http://localhost:8545", "0xbf6a53f7e517752de846ef41db74117f2bd16010")

//deposit 100 ETH from Alice acc.
async function depositAndGetBlock(){
  let deposited = await Omg.depositEth("10", alice)
  console.log("finished")
  let blockNum = await Omg.getDepositBlock('0x2793f2c0512a4a99a7da03635dac862acaacf615b62d2e01f75941af1cd9c332')
}

depositAndGetBlock()




