function hexToBytes (hex) {
  hex = hex.toString(16)
  hex = hex.replace(/^0x/i, '')
  hex = hex.length % 2 ? '0' + hex : hex

  let bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }

  return bytes
};

module.exports = hexToBytes
