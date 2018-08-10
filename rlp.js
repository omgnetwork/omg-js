//encoding & decoding to RLP
var RLP = require('rlp');

/*
struct
[
    tx.blknum1,
    tx.txindex1,
    tx.oindex1,
    tx.blknum2,
    tx.txindex2,
    tx.oindex2,
    tx.cur12,
    tx.newowner1,
    tx.amount1,
    tx.newowner2,
    tx.amount2,
    sig1,
    sig2
]
*/

let arr0 = Buffer.from( new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) );
let arr1 = Buffer.from( new Uint8Array([167, 71, 9, 89, 117, 247, 81, 184, 12, 77, 117, 140, 242, 165, 113, 54, 197, 206, 125, 64]) );
let arr2 = Buffer.from( new Uint8Array([250, 54, 190, 82, 227, 43, 56, 196, 96, 26, 202, 105, 33, 11, 215, 101, 170, 9, 26, 105]) );
let arr3 = Buffer.from( new Uint8Array([65, 135, 134, 17, 237, 82, 133, 224, 104, 19, 228, 230, 207, 71, 212, 98, 10, 18, 86, 147, 253, 62, 241, 237, 131, 249, 39, 96, 187, 24, 50, 134, 89, 122, 130, 66, 124, 38, 196, 5, 245, 104, 80, 174, 228, 104, 245, 120, 99, 37, 21, 30, 127, 140, 75, 158, 170, 141, 99, 182, 44, 98, 38, 142, 27]) );
let arr4 = Buffer.from( new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) );

const inputRaw = [
    2676001,
    0,
    0,
    0,
    0,
    0,
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [167, 71, 9, 89, 117, 247, 81, 184, 12, 77, 117, 140, 242, 165, 113, 54, 197, 206, 125, 64],
    7,
    [250, 54, 190, 82, 227, 43, 56, 196, 96, 26, 202, 105, 33, 11, 215, 101, 170, 9, 26, 105],
    3,
    [65, 135, 134, 17, 237, 82, 133, 224, 104, 19, 228, 230, 207, 71, 212, 98, 10, 18, 86, 147, 253, 62, 241, 237, 131, 249, 39, 96, 187, 24, 50, 134, 89, 122, 130, 66, 124, 38, 196, 5, 245, 104, 80, 174, 228, 104, 245, 120, 99, 37, 21, 30, 127, 140, 75, 158, 170, 141, 99, 182, 44, 98, 38, 142, 27],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]

const inputBuffer = [
    2676001,
    0,
    0,
    0,
    0,
    0,
    arr0,
    arr1,
    7,
    arr2,
    3,
    arr3,
    arr4
]

//encode rawTx into RLP encoded Buffer
const rlpEncode = async (rawTx) => {
    try {
        //if is Array, turn into Uint8 and Transform to Buffer
        let arr = await toUint8(rawTx)
        
        let encoded = RLP.encode(rawTx);
        let stringifyJSON = await JSON.stringify(encoded)
        let rlpEncoded =  await JSON.parse(stringifyJSON).data
        console.log(rlpEncoded)
        return rlpEncoded
    }
    catch(err) {
        console.log(err)
    }
}


//private function, turns regular arr into arr with Buffer binary
const toUint8 = async (arr) => {
    try {
        for(var i = 0; i < arr.length; i ++){
            if(Array.isArray(arr[i])){
                arr[i] = Buffer.from( new Uint8Array(arr[i]) );
            } 
        }
        console.log(arr)
        return arr      
    } catch(err) {
        console.log(err)
    }
    
}

module.exports = rlpEncode


rlpEncode(inputRaw)
//toUint8(inputRaw)
//console.log(inputBuffer)