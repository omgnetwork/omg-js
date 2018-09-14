//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps

let childChainLocal = "http://localhost:9656"

const OMG = require('../omg')
const Omg = new OMG("watcher_url", childChainLocal, "web3_provider", "plasma_addr")


let inputz_1 = { blknum1: 3176001, txindex1: 0, oindex1: 0 }
let inputz_2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
let currz = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
let ownerz = [ 
    { newowner1: '0x32c31f4c277e050a97e1bee6a619f70627de8570', amount1: 1 },
    { newowner2: '0x1522579be266dcbdae704b4129cf0d30dc99b51e', amount2: 1 } 
]
let alicePriv = "0x8f265d5e82cb327c687222d0a9de4178ad9b40922f9dda08932b5319d5aa4a9d"

Omg.sendTransaction([inputz_1, inputz_2], currz , ownerz, alicePriv)
