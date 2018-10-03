// decoding and encoding BASE16 Values

const BASE16 = '0123456789abcdef'
let bs16 = require('base-x')(BASE16)
const debug = require('debug')('omg.childchain.base16')

function base16Decode (encodedHash) {
  let lowerCaseHash = encodedHash.toLowerCase()
  let decoded = JSON.stringify(bs16.decode(lowerCaseHash))
  let decodedObject = JSON.parse(decoded).data
  debug(`decoded object is: ${decodedObject}`)
  return decodedObject
}

// encoding function
function base16Encode (binary) {
  let base16Encoded = bs16.encode(binary).toUpperCase()
  debug(`encoded object is: ${base16Encoded}`)
  return base16Encoded
}

module.exports = { base16Encode, base16Decode }
