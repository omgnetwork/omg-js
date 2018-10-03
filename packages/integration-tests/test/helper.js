
async function createAccount (web3, password) {
  const acc = await web3.eth.personal.newAccount(password)
  return acc.toLowerCase()
}

async function createAndFundAccount (
  web3,
  newAccountPassword,
  fundAccount,
  fundAccountPassword,
  value) {
  const account = await createAccount(web3, newAccountPassword)

  await web3.eth.personal.unlockAccount(fundAccount, fundAccountPassword)
  await web3.eth.sendTransaction({
    from: fundAccount,
    to: account,
    value
  })

  return account
}

module.exports = { createAccount, createAndFundAccount }
