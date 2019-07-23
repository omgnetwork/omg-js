
function wait (ms) {
  return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

async function waitChallengePeriodWaitTime (rootChain, exitData) {
  let waitMs = await rootChain.plasmaContract.methods.getExitableTimestamp(exitData.utxo_pos.toString()).call()
  waitMs = (Number(waitMs) - Math.trunc(Date.now() / 1000)) * 1000

  console.log(`Waiting for ${waitMs} millis for challenge period to end...`)

  await wait(waitMs)

  console.log(`Challenge period to finished`)
}

async function waitForTransaction (web3, transactionHash, millisToWaitForTxn, blocksToWaitForTxn) {
  var transactionReceiptAsync = async (transactionHash, resolve, reject) => {
    try {
      let transactionReceipt = await web3.eth.getTransactionReceipt(transactionHash)

      if (blocksToWaitForTxn > 0) {
        try {
          let block = await web3.eth.getBlock(transactionReceipt.blockNumber)
          let current = await web3.eth.getBlock('latest')

          console.log(`transaction block: ${block.number}`)
          console.log(`current block:     ${current.number}`)

          if (current.number - block.number >= blocksToWaitForTxn) {
            let transaction = await web3.eth.getTransaction(transactionHash)

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
  wait: wait,
  waitChallengePeriodWaitTime: waitChallengePeriodWaitTime,
  waitForTransaction: waitForTransaction
}
