//generates signature

/*
input:
<<248, 208, 131, 4, 3, 89, 128, 128, 128, 128, 128, 148, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 148, 116, 90, 78, 212, 118, 51, 233, 165,
  245, 155, 19, 234, 50, 191, 20, 131, 178, 219, 41, 65, 7, 148, 101, 166, 194,
  146, 88, 167, 6, 177, 55, 187, 239, 105, 27, 233, 12, 165, 29, 47, 182, 80, 3,
  184, 65, 164, 116, 60, 85, 244, 130, 31, 15, 131, 76, 180, 87, 174, 195, 15,
  154, 159, 213, 143, 45, 134, 5, 29, 191, 184, 20, 116, 163, 166, 80, 203, 16,
  65, 223, 117, 138, 161, 49, 176, 77, 120, 87, 62, 116, 60, 44, 234, 232, 32,
  47, 205, 172, 157, 115, 223, 89, 86, 188, 147, 191, 86, 54, 220, 188, 27, 184,
  65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0>>

  output:
  <<141, 71, 59, 252, 39, 243, 159, 15, 219, 218, 102, 12, 86, 193, 183, 238, 72,
  224, 70, 252, 26, 46, 111, 176, 96, 198, 135, 5, 51, 164, 225, 234, 124, 176,
  154, 37, 151, 221, 232, 225, 107, 149, 50, 243, 63, 178, 96, 109, 176, 28, 48,
  135, 224, 35, 140, 220, 191, 244, 40, 136, 229, 155, 174, 223, 27>>

  byte array for 'test'
  [156, 34, 255, 95, 33, 240, 184, 27, 17, 62, 99, 247, 219, 109, 169, 79, 237,
  239, 17, 178, 17, 155, 64, 136, 184, 150, 100, 251, 154, 60, 182, 88]
*/

keccak256 = require('js-sha3').keccak256;


//converting elixir's Uint8 Array to hex
/*
var hello_elixir_bytes = Buffer.from(new Uint8Array([58, 194, 37, 22, 141, 245, 66, 18, 162, 92, 28, 1, 253, 53, 190, 191, 234, 64,
    143, 218, 194, 227, 29, 221, 111, 128, 164, 187, 249, 165, 241, 203]))
var hello_elixir_hash = hello_elixir_bytes.toString('hex')
*/
const hash = async (message) => {
    let hexValue = await keccak256(message)
    let bufferValue = new Buffer(hexValue, "hex")
    let uint8Value = new Uint8Array(bufferValue)
    console.log(uint8Value)
    return uint8Value
}

// Produces a stand-alone, 65 bytes long, signature for message hash.
const signatureDigest = async (digest, priv) => {

}

const signature = async (message, privateKey) => {
    let hashedMsg = await hash(message);
    // signatureDigested = (hashedMsg, privateKey)
}

module.exports = {signature, hash}




//input_hex = Buffer.from(hello_elixir_hash)
//console.log(input_hex)

//Javascript
hash(new Uint8Array([141, 71, 59, 252, 39, 243, 159, 15, 219, 218, 102, 12, 86, 193, 183, 238, 72,
    224, 70, 252, 26, 46, 111, 176, 96, 198, 135, 5, 51, 164, 225, 234, 124, 176,
    154, 37, 151, 221, 232, 225, 107, 149, 50, 243, 63, 178, 96, 109, 176, 28, 48,
    135, 224, 35, 140, 220, 191, 244, 40, 136, 229, 155, 174, 223, 27]))
//intToByteArray(3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb)


//sign message with private key


