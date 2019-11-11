// This is universal, works with Infura -- set provider accordingly
function hex_to_ascii(str1) {
  var hex = str1.toString()
  var str = ''
  for (var n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16))
  }
  return str
}

async function reason({ web3, hash }) {
  console.log('tx hash:', hash)

  let tx = await web3.eth.getTransaction(hash)
  if (!tx) {
    console.log('tx not found')
  } else {
    let code = await web3.eth.call(tx, tx.blockNumber)
    console.log(code)
    let reason = hex_to_ascii(code.substr(138))
    console.log('revert reason:', reason)
  }
}

module.exports = reason
