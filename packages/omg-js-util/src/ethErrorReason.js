
  async function reason ({ web3, hash }) {
    const tx = await web3.eth.getTransaction(hash)
    if (!tx) {
      console.log('tx not found, cannot get reason')
    } else {
      const code = await web3.eth.call(tx, tx.blockNumber)
      const reason = web3.eth.toAscii(code.substr(138))
      console.log('revert reason:', reason)
      return reason
    }
  }
  
  module.exports = reason
  