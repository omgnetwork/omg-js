/*
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const rcHelper = require('./rootChainHelper')

// The 'faucetFaucet' is for automatically setting up a faucet.
// It's used when testing locally with a (possibly) clean chain
// that probably doesn't have a dedicated faucet account.

async function topUpEth (web3, address, value, fundAccount) {
  const txDetails = {
    from: fundAccount.address,
    to: address,
    value
  }
  await rcHelper.setGas(web3.eth, txDetails)

  if (this.fundAccount.privateKey) {
    // If a private key has been set then use it.
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, fundAccount.privateKey)
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  } else {
    // Otherwise try with a password.
    const unlocked = await web3.eth.personal.unlockAccount(fundAccount.address, fundAccount.password)
    if (unlocked) {
      return web3.eth.sendTransaction(txDetails)
    }
  }

  throw new Error(`Funding account ${fundAccount} password or private key not set`)
}

async function topUpERC20 (web3, address, value, contract, fundAccount) {
  const txDetails = {
    from: fundAccount.address,
    to: contract._address,
    data: contract.methods.transfer(address, value.toString()).encodeABI()
  }
  await rcHelper.setGas(web3.eth, txDetails)

  if (fundAccount.privateKey) {
    // If a private key has been set then use it.
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, fundAccount.privateKey)
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  } else {
    // Otherwise try with a password.
    const unlocked = await web3.eth.personal.unlockAccount(fundAccount.address, fundAccount.password)
    if (unlocked) {
      return web3.eth.sendTransaction(txDetails)
    }
  }

  throw new Error(`Funding account ${fundAccount} password or private key not set`)
}

module.exports = { topUpEth, topUpERC20 }
