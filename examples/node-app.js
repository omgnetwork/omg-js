//example node app to run OMG.JS Library 
//IMPORTANT: Do not store Privatekey as strings in production apps


let childChainPort = "http://35.200.30.83:9656"
let childChainLocal = "http://localhost:9656"


let alicePriv = Buffer.from( new Uint8Array([106, 207, 117, 46, 150, 0, 149, 34, 174, 60, 163, 63, 65, 218, 206, 114, 216, 69, 40, 30, 49, 70, 79, 95, 108, 4, 133, 50, 78, 238, 203, 64]))

const amount1 = 7
const amount2 = 3
const blknum1 = 102001
const blknum2 = 0
const oindex1 = 0
const oindex2 = 0
const txindex1 = 0
const txindex2 = 0
const cur12 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const newowner1 = [224, 221, 52, 231, 37, 65, 171, 127, 103, 11, 162, 4, 25, 10, 15, 75, 70, 11, 60, 241]
const newowner2 = [175, 95, 45, 137, 128, 70, 9, 176, 62, 9, 101, 153, 142, 191, 49, 165, 49, 64, 7, 255]

const _inputs = [{blknum1, txindex1, oindex1}]

const _currency = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

const _outputs = [{newowner1, amount1},{newowner2, amount2}]


const OMG = require('../omg')
const Omg = new OMG(childChainLocal)

Omg.sendTransaction(_inputs, _currency, _outputs, alicePriv)


