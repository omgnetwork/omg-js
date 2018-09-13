//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps


//let childChainPort = "http://35.200.30.83:9656"
let childChainLocal = "http://localhost:9656"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", childChainLocal, "web3_provider", "plasma_addr")


let inputz_1 = { blknum1: 1167001, txindex1: 0, oindex1: 0 }
let inputz_2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
let currz = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
let ownerz = [ 
    { newowner1: '0x2eac736d6f0d71d3e51345417a5b205bfa4748a8', amount1: 3 },
    { newowner2: '0x542740fabe3222a5a4e3c8521f63ab74ac6c77d9', amount2: 2 } 
]
let alicePriv = "0xe6dfd35b7c5b4f2e69b57756c926a89b185c5e7e0551a604c890e6a840192ae4"

Omg.sendTransaction([inputz_1, inputz_2], currz , ownerz, alicePriv)