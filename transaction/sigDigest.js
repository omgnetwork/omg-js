var EthUtil = require('ethereumjs-util');
var sigUtil = require('eth-sig-util');
var hexToByteArr = require('../helpers/hexToByteArr')

//call this is implementation of signature_digest function
const signatureDigest = (hashed, priv) => {
    try {
        let ecSigned = EthUtil.ecsign(hashed, priv); 
        let rpcSig = EthUtil.bufferToHex(sigUtil.concatSig(ecSigned.v, ecSigned.r, ecSigned.s))
        let hexToUint8 = hexToByteArr(rpcSig)
        return hexToUint8
    } catch(err){
        console.log(err)
    }
}



//signatureDigest2(hashedValue, alicePriv)

//alice.priv in buffer
//let alicePriv = Buffer.from( new Uint8Array([165, 253, 5, 87, 255, 90, 198, 97, 236, 75, 74, 205, 119, 102, 148, 243, 213, 102, 3, 104, 36, 251, 206, 152, 50, 114, 92, 65, 154, 84, 48, 47]))

//hashed Datas in buffer

//let hashedValue = Buffer.from( new Uint8Array([41, 144, 16, 100, 71, 248, 218, 223, 141, 45, 112, 193, 233, 207, 77, 182, 81, 153, 105, 181, 171, 62, 167, 202, 94, 82, 96, 151, 227, 31, 188, 58]))

module.exports = signatureDigest;


//output
//0xb35ee74243c506d32451097501d3ee45b103e4ab61a5c51fd1586c7841e6344a3f046ef6f2597a9f5f65d448eea16506503f4292961ee128890662e1b1bc556ebaf39add708bb2c00
//0xb35ee74243c506d32451097501d3ee45b103e4ab61a5c51fd1586c7841e6344a3f046ef6f2597a9f5f65d448e961ee128890662e1b1bc556ebaf39add708bb2c1b
//expected output from elixir
//179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 233, 97, 238, 18, 136, 144, 102, 46, 27, 27, 197, 86, 235, 175, 57, 173, 215, 8, 187, 44, 27
//179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 233, 97, 238, 18, 136, 144, 102, 46, 27, 27, 197, 86, 235, 175, 57, 173, 215, 8, 187, 44, 27
