/*
Copyright 2019 OmiseGO Pte Ltd

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
const ccHelper = require('./childChainHelper')
const faucetFaucet = require('./faucetFaucet')
const { transaction, getErc20Balance } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const erc20abi = require('human-standard-token-abi')
const faucet = {
  init: async function (rootChain, childChain, web3, config) {
    if (this.initialised) {
      return
    }
    this.initialised = true

    console.info('----------------- Initialising Faucet -----------------------')

    this.rootChain = rootChain
    this.childChain = childChain
    this.address = config.testFaucetAddress
    this.privateKey = config.testFaucetPrivateKey
    this.erc20ContractAddress = config.testErc20Contract
    this.erc20Contract = new web3.eth.Contract(erc20abi, this.erc20ContractAddress)

    // The fundAccount is used to top up the faucet - useful for local testing
    // that may not have a dedicated faucet
    this.fundAccount = await getFundAccount(web3, config)

    if (!this.address || this.address === '') {
      // If no faucet configured, create a new one. This is really only useful when running tests locally.
      const faucetAccount = rcHelper.createAccount(web3)
      console.log(`Created new test faucet ${JSON.stringify(faucetAccount)}`)
      this.address = faucetAccount.address
      this.privateKey = faucetAccount.privateKey
    }

    await this.initEthBalance(web3, web3.utils.toWei(config.minAmountEth || '3', 'ether'))
    await this.initERC20Balance(web3, config.minAmountERC20 || 20)
    await this.addToken(this.erc20ContractAddress)
    await this.addToken(transaction.ETH_CURRENCY)
    await this.showInfo(web3)
  },

  addToken: async function (currency) {
    const hasToken = await this.rootChain.hasToken(currency)
    if (!hasToken) {
      console.log(`Adding ${currency} to exit queue`)
      await this.rootChain.addToken(
        currency,
        { from: this.address, privateKey: this.privateKey }
      )
    } else {
      console.log(`Exit queue for ${currency} already exists`)
    }
  },

  showInfo: async function (web3) {
    console.info('----------------- Faucet -----------------------')
    console.info(`Address: ${this.address}`)
    console.info(`ERC20 token: ${this.erc20ContractAddress}`)
    console.info('----------------- ')
    console.info(`Rootchain ETH balance: ${await web3.eth.getBalance(this.address)}`)
    console.info(`Rootchain ERC20 balance: ${await getErc20Balance({ web3, erc20Address: this.erc20ContractAddress, address: this.address })}`)
    console.info('----------------- ')

    const ccBalance = await this.childChain.getBalance(this.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    const ccErc20Balance = ccBalance.find(e => e.currency.toLowerCase() === this.erc20ContractAddress.toLowerCase())

    console.info(`Childchain ETH balance: ${ccEthBalance ? ccEthBalance.amount.toString() : '0'}`)
    console.info(`Childchain ERC20 balance: ${ccErc20Balance ? ccErc20Balance.amount.toString() : '0'}`)
    console.info('----------------- Faucet -----------------------')
  },

  initEthBalance: async function (web3, minAmount) {
    if (numberToBN(minAmount).eqn(0)) {
      return
    }

    // Check that the faucet has enough childchain funds to run the tests
    const ccBalance = await this.childChain.getBalance(this.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    if (!ccEthBalance || numberToBN(ccEthBalance.amount).lt(numberToBN(minAmount))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccEthBalance ? numberToBN(minAmount).sub(numberToBN(ccEthBalance.amount)) : numberToBN(minAmount)

      // Check if there are enough root chain funds in the faucet
      const rcEthBalance = await web3.eth.getBalance(this.address)
      if (numberToBN(rcEthBalance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpEth(web3, needed)
      }

      try {
        console.log(`Not enough Child chain ETH in faucet ${this.address}, attempting to deposit ${needed.toString()} ETH from root chain`)
        await rcHelper.depositEth(this.rootChain, this.address, needed, this.privateKey)
        await ccHelper.waitForBalance(
          this.childChain,
          this.address,
          transaction.ETH_CURRENCY,
          balance => numberToBN(balance.amount).gte(numberToBN(minAmount))
        )
        console.log(`Test faucet ${this.address} topped up with ${needed.toString()} ETH`)
      } catch (err) {
        console.warn(`Error topping up faucet ${this.address}`)
        throw err
      }
    }

    // Check if there are still enough root chain funds in the faucet
    const rcEthBalance = await web3.eth.getBalance(this.address)
    if (numberToBN(rcEthBalance).lt(numberToBN(minAmount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpEth(web3, minAmount)
    }
  },

  initERC20Balance: async function (web3, minAmount) {
    if (numberToBN(minAmount).eqn(0)) {
      return
    }

    // Check that the faucet has enough funds to run the tests
    const ccBalances = await this.childChain.getBalance(this.address)
    const ccCurrencyBalance = ccBalances.find(e => e.currency === this.erc20ContractAddress)
    if (!ccCurrencyBalance || numberToBN(ccCurrencyBalance.amount).lt(numberToBN(minAmount))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccCurrencyBalance ? numberToBN(minAmount).sub(numberToBN(ccCurrencyBalance.amount)) : numberToBN(minAmount)
      // Check if there are enough root chain funds in the faucet
      const erc20Balance = await getErc20Balance({ web3, erc20Address: this.erc20ContractAddress, address: this.address })
      if (numberToBN(erc20Balance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpERC20(web3, needed)
      }

      try {
        console.log(`Not enough Child chain erc20 tokens in faucet ${this.address}, attempting to deposit ${needed.toString()} ${this.erc20ContractAddress} from root chain`)
        const erc20VaultAddress = await this.rootChain.getErc20VaultAddress()
        await rcHelper.approveERC20(web3, this.erc20Contract, this.address, this.privateKey, erc20VaultAddress, needed.toNumber())
        const allowed = await this.erc20Contract.methods.allowance(this.address, erc20VaultAddress).call()
        if (allowed === '0') {
          throw new Error('ERC20 approval failed!')
        }
        await rcHelper.depositToken(this.rootChain, this.address, needed.toNumber(), this.erc20ContractAddress, this.privateKey)
        await ccHelper.waitForBalance(
          this.childChain,
          this.address,
          this.erc20ContractAddress,
          balance => numberToBN(balance.amount).gte(numberToBN(minAmount))
        )
        console.log(`Test faucet ${this.address} topped up with ${needed.toString()} ${this.erc20ContractAddress}`)
      } catch (err) {
        console.error(`Error depositing ${needed.toString()} ${this.erc20ContractAddress} - not enough tokens in faucet?`)
        throw err
      }
    }
  },

  topUpEth: async function (web3, amount) {
    try {
      const topup = numberToBN(amount).add(numberToBN(web3.utils.toWei('0.1', 'ether'))) // A bit extra for gas
      console.log(`Not enough Root chain ETH in faucet ${this.address}, attempting to top up with ${topup.toString()}`)
      await faucetFaucet.topUpEth(web3, this.address, topup, this.fundAccount)
      await rcHelper.waitForEthBalance(web3, this.address, balance => numberToBN(balance).gte(topup))
    } catch (err) {
      console.warn(err)
      throw new Error(`Not enough ETH in test faucet ${this.address}. Please top up!`)
    }
  },

  topUpERC20: async function (web3, amount) {
    try {
      console.log(`Not enough Root chain erc20 tokens in faucet ${this.address}, attempting to top up with ${amount.toString()} tokens`)
      await faucetFaucet.topUpERC20(web3, this.address, amount, this.erc20Contract, this.fundAccount)
      await rcHelper.waitForERC20Balance(web3, this.address, this.erc20ContractAddress, balance => numberToBN(balance).gte(amount))
    } catch (err) {
      console.warn(err)
      throw new Error(`Not enough ${this.erc20ContractAddress} tokens in test faucet ${this.address}. Please top up!`)
    }
  },

  fundChildchain: async function (address, amount, currency) {
    const ret = await ccHelper.send(
      this.childChain,
      this.address,
      address,
      amount,
      currency,
      this.privateKey,
      this.rootChain.plasmaContractAddress
    )
    console.log(`Faucet sent ${amount} ${currency} on childchain to ${address}`)
    return ret
  },

  fundRootchainEth: async function (web3, address, amount) {
    if (amount <= 0) {
      return
    }

    const txDetails = {
      from: this.address,
      to: address,
      value: amount
    }
    const ret = await rcHelper.sendTransaction(web3, txDetails, this.privateKey)
    console.log(`Faucet sent ${amount} ETH on root chain to ${address}`)
    return ret
  },

  fundRootchainERC20: async function (web3, address, amount) {
    if (amount <= 0) {
      return
    }

    const balance = await getErc20Balance({ web3, erc20Address: this.erc20ContractAddress, address: this.address })
    if (numberToBN(balance).lt(numberToBN(amount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpERC20(web3, amount)
    }

    const txDetails = {
      from: this.address,
      to: this.erc20ContractAddress,
      data: this.erc20Contract.methods.transfer(address, amount.toString()).encodeABI()
    }
    return rcHelper.sendTransaction(web3, txDetails, this.privateKey)
  },

  returnFunds: async function (web3, account) {
    return Promise.all([this.returnChildchainFunds(account), this.returnRootchainFunds(web3, account)])
  },

  returnChildchainFunds: async function (account) {
    const balances = await this.childChain.getBalance(account.address)
    return Promise.all(balances.map(async (balance) => {
      const ret = await ccHelper.send(
        this.childChain,
        account.address,
        this.address,
        balance.amount,
        balance.currency,
        account.privateKey,
        this.rootChain.plasmaContractAddress
      )
      console.log(`${account.address} returned ${balance.amount} ${balance.currency} to faucet on childchain`)
      return ret
    }))
  },

  returnRootchainFunds: async function (web3, account) {
    const balance = await web3.eth.getBalance(account.address)
    if (balance.toString() !== '0') {
      const txDetails = {
        from: account.address,
        to: this.address
      }

      // Check that the account's balance isn't less than the gas it would cost to send the transaction
      await rcHelper.setGas(web3.eth, txDetails)
      const txGas = numberToBN(txDetails.gas).mul(numberToBN(txDetails.gasPrice))
      const txValue = numberToBN(balance).sub(txGas)
      if (txValue.gt(0)) {
        txDetails.value = txValue
        const ret = await rcHelper.sendTransaction(web3, txDetails, account.privateKey)
        console.log(`${account.address} returned ${txValue} ETH to faucet on root chain`)
        return ret
      }
    }
  }
}

async function getFundAccount (web3, config) {
  const fundAccount = {
    privateKey: config.fundAccountPrivateKey,
    password: config.fundAccountPassword
  }

  if (config.fundAccount && config.fundAccount !== '') {
    fundAccount.address = config.fundAccount
  } else {
    // Default to using eth.accounts[0]
    const accounts = await web3.eth.getAccounts()
    fundAccount.address = accounts[0]
  }

  return fundAccount
}

module.exports = faucet
