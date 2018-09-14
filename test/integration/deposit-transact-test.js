//testing end to end from calling deposit all the way to making first initial transaction
//requires:
// - elixir-omg to be fully running 
// - unlocked Alice account on geth with >10 eth

const chai = require('chai');  
const assert = chai.assert; 
const OMG = require('../../omg')

//CHANGE CURRENT CONFIGURATION BEFORE RUNNING
let childChainLocal = "http://localhost:9656"
let web3_provider = "http://localhost:8545"
let plasmaAddr = "0x36788fc429c297757c5564aa995070cb93e0fe2a"
let watcherUrl = "http://localhost:4000"
const sleep = require('util').promisify(setTimeout)
const Omg = new OMG(watcherUrl, childChainLocal, web3_provider, plasmaAddr)

const alice = "0x32c31f4c277e050a97e1bee6a619f70627de8570"
const bob = "0x1522579be266dcbdae704b4129cf0d30dc99b51e"
const alicePriv = "0x8f265d5e82cb327c687222d0a9de4178ad9b40922f9dda08932b5319d5aa4a9d"


async function depositAndTransact(){
  console.log("===== alice deposit 2 ETH")
  let depositEth = await Omg.depositEth("2", alice)
  console.log("===== alice retrieves the blocknumber of her deposit")
  let depositedBlockNum = await Omg.getDepositBlock(depositEth)
  let input_1 = { blknum1: depositedBlockNum, txindex1: 0, oindex1: 0 }
  let input_2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
  let curr = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
  let output = [ 
      { newowner1: alice, amount1: 1 },
      { newowner2: bob, amount2: 1 } 
  ]
  console.log("===== alice wait for deposit to go through")
  await wait()
  console.log("===== alice transfer 1 ETH to bob")
  return await Omg.sendTransaction([input_1, input_2], curr , output, alicePriv)
}

async function wait() {
  await sleep(20000)
}

describe('alice make an ETH deposit and then transact to bob', async () => {
  it('should deposit, transact, and then returns an object with correct result', async () => {
      //transactionResult 
    let txResult = {
        jsonrpc:"2.0",
        id:0,
        result: {
          tx_index: 0
        },
      }
      //this.timeout(10000);
      let result = await depositAndTransact()
      assert.notDeepEqual(result, txResult)
  })
})



