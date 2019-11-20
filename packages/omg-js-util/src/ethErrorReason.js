const web3Utils = require('web3-utils')
async function reason ({ web3, hash }) {
  const tx = await web3.eth.getTransaction(hash)
  if (!tx) {
    console.log('tx not found, cannot get reason')
  } else {
    const code = await web3.eth.call(tx, tx.blockNumber)
    if (code === '0x') return
    const reason = web3Utils.toAscii(code.substr(138))
    console.log('revert reason:', reason)
    return reason
  }
}

module.exports = reason
