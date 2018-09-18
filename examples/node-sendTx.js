//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps

let childChainLocal = "http://localhost:9656"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", childChainLocal, "web3_provider", "plasma_addr")


let inputz_1 = { blknum1: 4769001, txindex1: 0, oindex1: 0 }
let inputz_2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
let currz = [ 33, 128, 23, 181, 247, 195, 241, 165, 141, 222, 158, 11, 148, 93, 30, 46, 13, 249, 216, 186 ]
let ownerz = [ 
    { newowner1: '0x95d6c5cf598adbd58ce2e169cde751fc51109f8b', amount1: 1 },
    { newowner2: '0x1522579be266dcbdae704b4129cf0d30dc99b51e', amount2: 1 } 
]
let alicePriv = "0x9756b46cfd1997131a4987b2f534cd93727f54c1351d8770a3e8519342f26b03"

Omg.sendTransaction([inputz_1, inputz_2], currz , ownerz, alicePriv)

