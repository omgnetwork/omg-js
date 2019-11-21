const hexPrefix = require('./hexPrefix')

async function reason ({ web3, hash }) {
  const tx = await web3.eth.getTransaction(hash)
  if (!tx) {
    console.log('Tx not found, cannot get reason')
  } else {
    const code = await web3.eth.call(tx, tx.blockNumber)
    const reason = web3.utils.toAscii(hexPrefix(code.substr(138)))
    console.log('Revert reason:', reason)
    return reason
  }
}

module.exports = reason
