//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps


let childChainPort = "http://35.200.30.83:9656"
let childChainLocal = "http://localhost:9656"


//let alicePriv = Buffer.from( new Uint8Array([165, 253, 5, 87, 255, 90, 198, 97, 236, 75, 74, 205, 119, 102, 148, 243, 213, 102, 3, 104, 36, 251, 206, 152, 50, 114, 92, 65, 154, 84, 48, 47]))
let alicePriv = "0x1e9302dba342ac8a1cc2d235768145637de78c51572658d12da4b3a61de65b6a"


const amount1 = 7
const amount2 = 3
const blknum1 = 3278001
const blknum2 = 0
const oindex1 = 0
const oindex2 = 0
const txindex1 = 0
const txindex2 = 0
const cur12 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

//const newowner1 = [116, 90, 78, 212, 118, 51, 233, 165, 245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65]
const newowner1 = "0x2fb4312f6bef40d1e1f4395a8c402e143a114d9e"
//const newowner2 = [101, 166, 194, 146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80]
const newowner2 = "0x53372da859f9b2d66c5f8be20238c6a12891a10c"
const _inputs = [{blknum1, txindex1, oindex1},{blknum2, txindex2, oindex2}]

const _currency = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const _outputs = [{newowner1, amount1},{newowner2, amount2}]


const OMG = require('../omg')
const Omg = new OMG(childChainPort)

Omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)