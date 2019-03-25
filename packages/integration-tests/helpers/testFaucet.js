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

const helper = require('./rootChainHelper')
const ccHelper = require('./childChainHelper')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')

const faucet = {
  init: async function (childChain, config, web3, rootChain, minAmount) {
    if (this.initialised) {
      return
    }
    this.initialised = true

    this.childChain = childChain
    this.address = config.testFaucetAddress
    this.privateKey = config.testFaucetPrivateKey

    if (!this.address || this.address === '') {
      // If no faucet configured, create a new one. This is really only useful when running tests locally.
      const faucetAccount = helper.createAccount(web3)
      console.log(`Created new test faucet ${JSON.stringify(faucetAccount)}`)
      this.address = faucetAccount.address
      this.privateKey = faucetAccount.privateKey
    }

    // Check that the faucet's balance is enough to run the tests
    const ccBalance = await this.childChain.getBalance(this.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    if (!ccEthBalance || numberToBN(ccEthBalance.amount).lt(minAmount)) {
      // If not, try to deposit more funds from the root chain
      const needed = ccEthBalance ? numberToBN(minAmount).sub(numberToBN(ccEthBalance.amount)) : numberToBN(minAmount)
      const rcEthBalance = await web3.eth.getBalance(this.address)
      if (numberToBN(rcEthBalance).lte(needed)) {
        try {
          // For local testing, try to fund the faucet account from accounts[0]
          const ethNeeded = needed.add(numberToBN(web3.utils.toWei('0.1', 'ether'))) // A bit extra for gas
          console.log(`Not enough Root chain funds in faucet ${this.address}, attempting to top up with ${ethNeeded.toString()}`)
          await helper.fundAccount(web3, config, this.address, ethNeeded)
          await helper.waitForEthBalance(web3, this.address, ethNeeded)
        } catch (err) {
          console.warn(err)
          throw new Error(`Not enough ETH in test faucet ${this.address}!`)
        }
      }
      console.log(`Not enough Child chain funds in faucet ${this.address}, attempting to deposit ${needed.toString()}`)
      await helper.depositEth(rootChain, childChain, this.address, needed, this.privateKey)
      await ccHelper.waitForBalance(childChain, this.address, needed)
      console.log(`Test faucet ${this.address} topped up.`)
    }
  },

  fundAccount: async function (address, value, currency) {
    if (value <= 0) {
      return
    }

    const utxos = await this.childChain.getUtxos(this.address)
    const utxosToSpend = ccHelper.selectUtxos(utxos, value, currency, false)
    if (!utxosToSpend || utxosToSpend.length === 0) {
      throw new Error(`Not enough funds in childChainFaucet to cover ${value} ${currency}`)
    }

    const privateKeys = new Array(utxosToSpend.length).fill(this.privateKey)
    return this.childChain.sendTransaction(
      this.address,
      utxosToSpend,
      privateKeys,
      address,
      value,
      currency
    )
  },

  returnFunds: async function (account) {
    const utxos = await this.childChain.getUtxos(account.address)
    const balances = await this.childChain.getBalance(account.address)
    return Promise.all(balances.map(balance => {
      const selectedUtxos = ccHelper.selectUtxos(utxos, balance.amount, balance.currency, false)
      if (selectedUtxos && selectedUtxos.length > 0) {
        const privateKeys = new Array(selectedUtxos.length).fill(account.privateKey)
        return this.childChain.sendTransaction(
          account.address,
          selectedUtxos,
          privateKeys,
          this.address,
          balance.amount,
          balance.currency
        )
      }
    }))
  }
}

module.exports = faucet
