//decoding and encoding BASE16 Values

const BASE16 = "0123456789abcdef"
let bs16 = require('base-x')(BASE16)

//decoding function
/*
var elixirrlp = "<<67, 130, 252, 224, 225, 60, 202, 236, 180, 106, 224, 167, 220, 6, 21, 177, 111, 165, 222, 42, 172, 26, 255, 49, 246, 112, 38, 80, 182, 28, 237, 26>>"
var encodedHash = "4382FCE0E13CCAECB46AE0A7DC0615B16FA5DE2AAC1AFF31F6702650B61CED1A"
//output: <Buffer 43 82 fc e0 e1 3c ca ec b4 6a e0 a7 dc 06 15 b1 6f a5 de 2a ac 1a ff 31 f6 70 26 50 b6 1c ed 1a>
*/
let base16Decode = async (encodedHash) => {
    let lowerCaseHash = encodedHash.toLowerCase()
    let decoded = await JSON.stringify(bs16.decode(lowerCaseHash))
    let decodedObject = await JSON.parse(decoded).data
    console.log(decodedObject)
    return decodedObject
}

//encoding function
let base16Encode = async (binary) => {
    let base16Encoded = bs16.encode(binary).toUpperCase()
    console.log(base16Encoded)
    return base16Encoded
}

module.exports = { base16Encode, base16Decode };