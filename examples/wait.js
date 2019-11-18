function wait (ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

async function waitForChallengePeriodToEnd (rootChain) {
  const minExitPeriod = await rootChain.plasmaContract.methods.minExitPeriod().call() * 1000
  const waitMs = (Number(minExitPeriod) * 2.1)

  console.log(`Waiting for ${waitMs * 0.00001667} min for the challenge period to end...`)
  await wait(waitMs)
  console.log('Challenge period finished')
}

async function waitForTransaction (web3, transactionHash, millisToWaitForTxn, blocksToWaitForTxn) {
  const transactionReceiptAsync = async (transactionHash, resolve, reject) => {
    try {
      const transactionReceipt = await web3.eth.getTransactionReceipt(transactionHash)

      if (blocksToWaitForTxn > 0) {
        try {
          const block = await web3.eth.getBlock(transactionReceipt.blockNumber)
          const current = await web3.eth.getBlock('latest')
          const remaining = blocksToWaitForTxn - (current.number - block.number)
          console.log(`${remaining} more block confirmations`)
          if (current.number - block.number >= blocksToWaitForTxn) {
            const transaction = await web3.eth.getTransaction(transactionHash)
            if (transaction.blockNumber !== null) {
              return resolve(transactionReceipt)
            } else {
              return reject(new Error('Transaction with hash: ' + transactionHash + ' ended up in an uncle block.'))
            }
          } else {
            setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), millisToWaitForTxn)
          }
        } catch (e) {
          setTimeout(() => transactionReceiptAsync(transactionHash, resolve, reject), millisToWaitForTxn)
        }
      } else {
        return resolve(transactionReceipt)
      }
    } catch (e) {
      return reject(e)
    }
  }

  return new Promise((resolve, reject) => transactionReceiptAsync(transactionHash, resolve, reject))
}

module.exports = {
  wait,
  waitForChallengePeriodToEnd,
  waitForTransaction
}
