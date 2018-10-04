// convert byte Array (JS equivalent is Uint8) to JavaScript Buffer

function byteArrToBuffer (arr) {
  return Buffer.from(new Uint8Array(arr))
}

module.exports = byteArrToBuffer
