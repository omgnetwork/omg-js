const promiseRetry = require('promise-retry')

function createAccount (web3) {
  const ret = web3.eth.accounts.create()
  ret.address = ret.address.toLowerCase()
  return ret
}

async function createAndFundAccount (web3, fundAccount, fundAccountPassword, value) {
  const newAccount = createAccount(web3)

  await web3.eth.personal.unlockAccount(fundAccount, fundAccountPassword)
  await web3.eth.sendTransaction({
    from: fundAccount,
    to: newAccount.address,
    value
  })

  return newAccount
}

function waitForBalance (childChain, address, expectedBalance) {
  return promiseRetry(async (retry, number) => {
    console.log('Waiting for balance... ', number)
    const resp = await childChain.getBalance(address)
    if (resp.length === 0 || resp[0].amount.toString() !== expectedBalance) {
      retry()
    }
    return resp
  })
}

module.exports = {
  createAccount,
  createAndFundAccount,
  waitForBalance
}
