async function sendTx (web3, txDetails, privateKey) {
  await setGas(web3, txDetails)
  if (!privateKey) {
    // No privateKey, caller will handle signing if necessary

    if (web3.version.api && web3.version.api.startsWith('0.2')) {
      return new Promise((resolve, reject) => {
        web3.eth.sendTransaction(txDetails, (err, transactionHash) => {
          if (err) {
            reject(err)
          } else {
            resolve({ transactionHash })
          }
        })
      })
    } else {
      return web3.eth.sendTransaction(txDetails)
    }
  } else {
    // TODO
    // First sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, privateKey)
    // Then send it
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

async function setGas (web3, txDetails) {
  if (!txDetails.gasPrice) {
    if (web3.version.api && web3.version.api.startsWith('0.2')) {
      return new Promise((resolve, reject) => {
        web3.eth.getGasPrice((err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    } else {
      txDetails.gasPrice = await web3.eth.getGasPrice()
    }
  }
  if (!txDetails.gas) {
    if (web3.version.api && web3.version.api.startsWith('0.2')) {
      return new Promise((resolve, reject) => {
        web3.eth.estimateGas(txDetails, (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    } else {
      txDetails.gas = await web3.eth.estimateGas(txDetails)
    }
  }
}

function getTxData (web3, contract, method, ...args) {
  if (web3.version.api && web3.version.api.startsWith('0.2')) {
    return contract[method].getData(...args)
  } else {
    return contract.methods[method](...args).encodeABI()
  }
}

module.exports = {
  sendTx,
  setGas,
  getTxData
}
