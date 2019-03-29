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
const ccHelper = require('./childChainHelper')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const erc20abi = require('human-standard-token-abi')

const faucet = {
  init: async function (rootChain, childChain, web3, config) {
    if (this.initialised) {
      return
    }
    this.initialised = true

    this.rootChain = rootChain
    this.childChain = childChain
    this.address = config.testFaucetAddress
    this.privateKey = config.testFaucetPrivateKey
    this.erc20ContractAddress = config.testErc20Contract
    this.erc20Contract = new web3.eth.Contract(erc20abi, this.erc20ContractAddress)
    this.fundAccount = await getFundAccount(web3, config)

    if (!this.address || this.address === '') {
      // If no faucet configured, create a new one. This is really only useful when running tests locally.
      const faucetAccount = rcHelper.createAccount(web3)
      console.log(`Created new test faucet ${JSON.stringify(faucetAccount)}`)
      this.address = faucetAccount.address
      this.privateKey = faucetAccount.privateKey
    }

    await this.initEthBalance(web3, web3.utils.toWei(config.minAmountEth || '20', 'ether'))
    await this.initERC20Balance(web3, config.minAmountERC20 || 100)
  },

  initEthBalance: async function (web3, minAmount) {
    // Check that the faucet's balance is enough to run the tests
    const ccBalance = await this.childChain.getBalance(this.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    if (!ccEthBalance || numberToBN(ccEthBalance.amount).lt(minAmount)) {
      // If not, try to deposit more funds from the root chain
      const needed = ccEthBalance ? numberToBN(minAmount).sub(numberToBN(ccEthBalance.amount)) : numberToBN(minAmount)
      const rcEthBalance = await web3.eth.getBalance(this.address)

      // Check if there are enough root chain funds in the faucet
      if (numberToBN(rcEthBalance).lte(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpEth(web3, needed)
      }

      try {
        console.log(`Not enough Child chain ETH in faucet ${this.address}, attempting to deposit ${needed.toString()} ETH from root chain`)
        await rcHelper.depositEth(this.rootChain, this.childChain, this.address, needed, this.privateKey)
        await ccHelper.waitForBalance(this.childChain, this.address, transaction.ETH_CURRENCY, balance => numberToBN(balance.amount).eq(needed))
        console.log(`Test faucet ${this.address} topped up with ${needed.toString()} ETH`)
      } catch (err) {
        console.warn(`Error topping up faucet ${this.address}`)
        throw err
      }
    }
  },

  topUpEth: async function (web3, amount) {
    try {
      const topup = numberToBN(amount).add(numberToBN(web3.utils.toWei('0.1', 'ether'))) // A bit extra for gas
      console.log(`Not enough Root chain ETH in faucet ${this.address}, attempting to top up with ${topup.toString()}`)
      await topUpFaucet(web3, this.address, topup, this.fundAccount)
      await rcHelper.waitForEthBalance(web3, this.address, balance => numberToBN(balance).gte(topup))
    } catch (err) {
      console.warn(err)
      throw new Error(`Not enough ETH in test faucet ${this.address}. Please top up!`)
    }
  },

  initERC20Balance: async function (web3, minAmount) {
    // Check that the faucet's balance is enough to run the tests
    const ccBalances = await this.childChain.getBalance(this.address)
    const ccCurrencyBalance = ccBalances.find(e => e.currency === this.erc20ContractAddress)
    if (!ccCurrencyBalance || numberToBN(ccCurrencyBalance.amount).lt(minAmount)) {
      // If not, try to deposit more funds from the root chain
      const needed = ccCurrencyBalance ? numberToBN(minAmount).sub(numberToBN(ccCurrencyBalance.amount)) : numberToBN(minAmount)

      // Check faucet erc20 balance
      const erc20Balance = await rcHelper.getERC20Balance(web3, this.erc20Contract, this.address, this.privateKey)
      if (numberToBN(erc20Balance).lte(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpERC20(web3, needed, this.erc20Contract)
      }

      try {
        console.log(`Not enough Child chain erc20 tokens in faucet ${this.address}, attempting to deposit ${needed.toString()} ${this.erc20ContractAddress} from root chain`)
        await rcHelper.approveERC20(web3, this.erc20Contract, this.address, this.privateKey, this.rootChain.plasmaContractAddress, needed.toString())
        await rcHelper.depositToken(this.rootChain, this.childChain, this.address, needed, this.erc20ContractAddress, this.privateKey)
        await ccHelper.waitForBalance(this.childChain, this.address, this.erc20ContractAddress, balance => numberToBN(balance.amount).gte(needed))
        console.log(`Test faucet ${this.address} topped up with ${needed.toString()} ${this.erc20ContractAddress}`)
      } catch (err) {
        console.error(`Error depositing ${needed.toString()} ${this.erc20ContractAddress} - not enough tokens in faucet?`)
        throw err
      }
    }
  },

  topUpERC20: async function (web3, amount, testErc20Contract) {
    try {
      // For local testing, try to automatically top up the faucet
      console.log(`Not enough Root chain erc20 tokens in faucet ${this.address}, attempting to top up with ${amount.toString()} tokens`)
      await topUpFaucetERC20(web3, this.address, amount, testErc20Contract, this.fundAccount)
      // TODO Should wait for balance...
      await rcHelper.sleep(2000)
    } catch (err) {
      console.warn(err)
      throw new Error(`Not enough ${testErc20Contract._address} tokens in test faucet ${this.address}. Please top up!`)
    }
  },

  fundChildchain: async function (address, amount, currency) {
    await ccHelper.send(this.childChain, this.address, address, amount, currency, this.privateKey)
    console.log(`Faucet sent ${amount} ${currency} on childchain to ${address}`)
  },

  fundRootchain: async function (web3, address, value) {
    if (value <= 0) {
      return
    }

    const txDetails = {
      from: this.address,
      to: address,
      value
    }
    await rcHelper.setGas(web3.eth, txDetails)

    const signedTx = await web3.eth.accounts.signTransaction(txDetails, this.privateKey)
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  },

  fundRootchainERC20: async function (web3, address, value) {
    if (value <= 0) {
      return
    }

    const balance = await rcHelper.getERC20Balance(web3, this.erc20Contract, this.address)
    if (numberToBN(balance).lt(numberToBN(value))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpERC20(web3, value, this.erc20Contract)
    }

    const txDetails = {
      from: this.address,
      to: this.erc20ContractAddress,
      data: this.erc20Contract.methods.transfer(address, value.toString()).encodeABI()
    }
    await rcHelper.setGas(web3.eth, txDetails)
    const signedTx = await web3.eth.accounts.signTransaction(txDetails, this.privateKey)
    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
  },

  returnFunds: async function (web3, account) {
    return Promise.all([this.returnChildchainFunds(account), this.returnRootchainFunds(web3, account)])
  },

  returnChildchainFunds: async function (account) {
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
  },

  returnRootchainFunds: async function (web3, account) {
    const txDetails = {
      from: account.address,
      to: this.address
    }
    await rcHelper.setGas(web3.eth, txDetails)

    const balance = await web3.eth.getBalance(account.address)
    if (balance.toString() !== '0') {
      const txGas = numberToBN(txDetails.gas).mul(numberToBN(txDetails.gasPrice))
      const txValue = numberToBN(balance).sub(txGas)
      if (txValue.gt(0)) {
        txDetails.value = txValue
        const signedTx = await web3.eth.accounts.signTransaction(txDetails, account.privateKey)
        return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
      }
    }
  }
}

async function topUpFaucet (web3, address, value, fundAccount) {
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

async function topUpFaucetERC20 (web3, address, value, contract, fundAccount) {
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
