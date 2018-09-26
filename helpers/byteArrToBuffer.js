// convert byte Array (JS equivalent is Uint8) to JavaScript Buffer

const byteArrToBuffer = (arr) => {
  let array = Buffer.from(new Uint8Array(arr))
  return array
}

module.exports = byteArrToBuffer
