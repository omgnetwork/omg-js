var EthUtil = require('ethereumjs-util');
var sigUtil = require('eth-sig-util');
const messageToSign = "hello world";
const privateKey = "43f2ee33c522046e80b67e96ceb84a05b60b9434b0ee2e3ae4b1311b9f5dcc46";

var msgHash = EthUtil.hashPersonalMessage(new Buffer(messageToSign));
var signature = EthUtil.ecsign(msgHash, new Buffer(privateKey, 'hex')); 
var signatureRPC = EthUtil.toRpcSig(signature.v, signature.r, signature.s)

//console.log(signatureRPC);

//alice.priv in buffer
const alicePriv = Buffer.from( new Uint8Array([165, 253, 5, 87, 255, 90, 198, 97, 236, 75, 74, 205, 119, 102, 148, 243, 213,
  102, 3, 104, 36, 251, 206, 152, 50, 114, 92, 65, 154, 84, 48, 47]))

//hashed in buffer

const hashedValue = Buffer.from( new Uint8Array([41, 144, 16, 100, 71, 248, 218, 223, 141, 45, 112, 193, 233, 207, 77, 182, 81,
    153, 105, 181, 171, 62, 167, 202, 94, 82, 96, 151, 227, 31, 188, 58]))

//call ECsign
var ecSigned = EthUtil.ecsign(hashedValue, alicePriv); 
var rpcSig = EthUtil.bufferToHex(sigUtil.concatSig(ecSigned.v, ecSigned.r, ecSigned.s))
//var rpcSig = EthUtil.toRpcSig(ecSigned.v, ecSigned.r, ecSigned.s)



console.log(rpcSig)

//output
//0xb35ee74243c506d32451097501d3ee45b103e4ab61a5c51fd1586c7841e6344a3f046ef6f2597a9f5f65d448eea16506503f4292961ee128890662e1b1bc556ebaf39add708bb2c00
//0xb35ee74243c506d32451097501d3ee45b103e4ab61a5c51fd1586c7841e6344a3f046ef6f2597a9f5f65d448e961ee128890662e1b1bc556ebaf39add708bb2c1b
//expected output from elixir
//179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 233, 97, 238, 18, 136, 144, 102, 46, 27, 27, 197, 86, 235, 175, 57, 173, 215, 8, 187, 44, 27
//179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 233, 97, 238, 18, 136, 144, 102, 46, 27, 27, 197, 86, 235, 175, 57, 173, 215, 8, 187, 44, 27

//output after converting JS
//179, 94, 231, 66, 67, 197, 6, 211, 36, 81, 9, 117, 1, 211, 238, 69, 177, 3, 228, 171, 97, 165, 197, 31, 209, 88, 108, 120, 65, 230, 52, 74, 63, 4, 110, 246, 242, 89, 122, 159, 95, 101, 212, 72, 238, 161, 101, 6, 80, 63, 66, 146, 150, 30, 225, 40, 137, 6, 98, 225, 177, 188, 85, 110, 186, 243, 154, 221, 112, 139, 178, 192