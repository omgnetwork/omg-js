async function sendTx(web3, txDetails, privateKey) {
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
    // First sign the transaction
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, prefixHex(privateKey))
    // Then send it
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  }
}

async function setGas(web3, txDetails) {
  if (!txDetails.gasPrice) {
    try {
      if (web3.version.api && web3.version.api.startsWith('0.2')) {
        txDetails.gasPrice = await new Promise((resolve, reject) => {
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
    } catch (err) {
      console.warn(`Error getting gas price: ${err}`)
      txDetails.gasPrice = '1000000000' // Default to 1 GWEI
    }
  }
  if (!txDetails.gas) {
    if (web3.version.api && web3.version.api.startsWith('0.2')) {
      txDetails.gas = await new Promise((resolve, reject) => {
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

function getTxData(web3, contract, method, ...args) {
  if (web3.version.api && web3.version.api.startsWith('0.2')) {
    return contract[method].getData(...args)
  } else {
    return contract.methods[method](...args).encodeABI()
  }
}

function int192toHex(int192) {
  if (typeof int192 === 'string') {
    return int192.startsWith('0x') ? int192 : `0x${int192}`
  } else {
    return `0x${int192.toString(16)}`
  }
}

function prefixHex(hexString) {
  return hexString.startsWith("0x") ? hexString : `0x${hexString}`
}

module.exports = {
  sendTx,
  setGas,
  getTxData,
  int192toHex
}
