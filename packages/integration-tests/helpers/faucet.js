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
const { transaction, getErc20Balance } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const erc20abi = require('human-standard-token-abi')

const currencyMap = {
  '0x0000000000000000000000000000000000000000': 'wei'
}
const faucet = {
  init: async function (rootChain, childChain, web3, config, faucet) {
    this.fundAccount = { address: config.fund_account, privateKey: config.fund_account_private_key }

    this.rootChain = rootChain
    this.childChain = childChain
    this.web3 = web3

    this.erc20ContractAddress = config.erc20_contract_address
    this.erc20Contract = new web3.eth.Contract(erc20abi, this.erc20ContractAddress)
    this.faucetAccount = this.createAccountFromString(faucet, config.faucet_salt)

    await this.initEthBalance(this.web3.utils.toWei(config.min_amount_eth_per_test, 'ether'), config.topup_multipler)
    await this.initERC20Balance(config.min_amount_erc20_per_test, config.topup_multipler)
    await this.addToken(this.erc20ContractAddress)
    await this.addToken(transaction.ETH_CURRENCY)
    await this.showInfo()
  },

  createAccountFromString: function (string, salt = '') {
    const privateKey = this.web3.utils.sha3(`${string}${salt}`)
    const account = this.web3.eth.accounts.privateKeyToAccount(privateKey)
    return { address: account.address, privateKey: account.privateKey }
  },

  addToken: async function (currency) {
    const hasToken = await this.rootChain.hasToken(currency)
    if (!hasToken) {
      console.log(`Adding ${currency} to exit queue`)
      return this.rootChain.addToken({
        token: currency,
        txOptions: {
          from: this.fundAccount.address,
          privateKey: this.fundAccount.privateKey
        }
      })
    } else {
      console.log(`Exit queue for ${currency} already exists`)
    }
  },

  showInfo: async function () {
    console.info('----------------- Faucet -----------------------')
    console.info(`Address: ${this.faucetAccount.address}`)
    console.info(`ERC20 token: ${this.erc20ContractAddress}`)
    console.info(`Rootchain ETH balance: ${await this.web3.eth.getBalance(this.faucetAccount.address)}`)
    console.info(`Rootchain ERC20 balance: ${await getErc20Balance({ web3: this.web3, erc20Address: this.erc20ContractAddress, address: this.faucetAccount.address })}`)

    const ccBalance = await this.childChain.getBalance(this.faucetAccount.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    const ccErc20Balance = ccBalance.find(e => e.currency.toLowerCase() === this.erc20ContractAddress.toLowerCase())

    console.info(`Childchain ETH balance: ${ccEthBalance ? ccEthBalance.amount.toString() : '0'}`)
    console.info(`Childchain ERC20 balance: ${ccErc20Balance ? ccErc20Balance.amount.toString() : '0'}`)
    console.info('------------------------------------------------')
  },

  initEthBalance: async function (minAmount, topupMultipler) {
    if (numberToBN(minAmount).eqn(0)) {
      return
    }

    const topupAmount = numberToBN(minAmount * topupMultipler)

    // Check that the faucet has enough childchain funds to run the tests
    const ccBalance = await this.childChain.getBalance(this.faucetAccount.address)
    const ccEthBalance = ccBalance.find(e => e.currency === transaction.ETH_CURRENCY)
    if (!ccEthBalance || numberToBN(ccEthBalance.amount).lt(numberToBN(minAmount))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccEthBalance ? topupAmount.sub(numberToBN(ccEthBalance.amount)) : topupAmount

      // Check if there are enough root chain funds in the faucet
      const rcEthBalance = await this.web3.eth.getBalance(this.faucetAccount.address)
      if (numberToBN(rcEthBalance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpEth(needed, this.faucetAccount.address)
      }

      try {
        console.log(`Not enough Child chain ETH in faucet ${this.faucetAccount.address}, attempting to deposit ${needed.toString()} ETH from root chain`)
        await this.rootChain.deposit({
          amount: needed,
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey
          }
        })
        await ccHelper.waitForBalance(
          this.childChain,
          this.faucetAccount.address,
          transaction.ETH_CURRENCY,
          balance => numberToBN(balance.amount).gte(numberToBN(topupAmount))
        )
        console.log(`Test faucet ${this.faucetAccount.address} topped up with ${needed.toString()} ETH`)
      } catch (err) {
        console.warn(`Error topping up faucet ${this.faucetAccount.address}`)
        throw err
      }
    }

    // Check if there are still enough root chain funds in the faucet
    const rcEthBalance = await this.web3.eth.getBalance(this.faucetAccount.address)
    if (numberToBN(rcEthBalance).lt(numberToBN(minAmount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpEth(topupAmount, this.faucetAccount.address)
    }
  },

  initERC20Balance: async function (minAmount, topupMultipler) {
    if (numberToBN(minAmount).eqn(0)) {
      return
    }

    const topupAmount = numberToBN(minAmount * topupMultipler)

    // Check that the faucet has enough funds to run the tests
    const ccBalances = await this.childChain.getBalance(this.faucetAccount.address)
    const ccCurrencyBalance = ccBalances.find(e => e.currency === this.erc20ContractAddress)
    if (!ccCurrencyBalance || numberToBN(ccCurrencyBalance.amount).lt(numberToBN(minAmount))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccCurrencyBalance ? topupAmount.sub(numberToBN(ccCurrencyBalance.amount)) : topupAmount
      // Check if there are enough root chain funds in the faucet
      const erc20Balance = await getErc20Balance({ web3: this.web3, erc20Address: this.erc20ContractAddress, address: this.faucetAccount.address })
      if (numberToBN(erc20Balance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpERC20(needed, this.faucetAccount.address)
      }

      try {
        console.log(`Not enough Child chain erc20 tokens in faucet ${this.faucetAccount.address}, attempting to deposit ${needed.toString()} ${this.erc20ContractAddress} from root chain`)
        await this.rootChain.approveToken({
          erc20Address: this.erc20ContractAddress,
          amount: needed.toNumber(),
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey,
            gas: 6000000
          }
        })
        const { address: erc20VaultAddress } = await this.rootChain.getErc20Vault()
        const allowed = await this.erc20Contract.methods.allowance(this.faucetAccount.address, erc20VaultAddress).call()
        if (allowed === '0') {
          throw new Error('ERC20 approval failed!')
        }
        await this.rootChain.deposit({
          amount: needed.toNumber(),
          currency: this.erc20ContractAddress,
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey
          }
        })
        await ccHelper.waitForBalance(
          this.childChain,
          this.faucetAccount.address,
          this.erc20ContractAddress,
          balance => numberToBN(balance.amount).gte(numberToBN(topupAmount))
        )
        console.log(`Test faucet ${this.faucetAccount.address} topped up with ${needed.toString()} ${this.erc20ContractAddress}`)
      } catch (err) {
        console.error(`Error depositing ${needed.toString()} ${this.erc20ContractAddress} - not enough tokens in faucet?`)
        throw err
      }
    }
  },

  topUpEth: async function (amount, address) {
    const topup = numberToBN(amount).add(numberToBN(this.web3.utils.toWei('0.1', 'ether'))) // A bit extra for gas
    console.log(`Not enough Root chain ETH in faucet ${address}, attempting to top up with ${topup.toString()}`)
    const txDetails = {
      from: this.fundAccount.address,
      to: address,
      value: topup
    }
    await rcHelper.setGas(this.web3.eth, txDetails)
    const signedTx = await this.web3.eth.accounts.signTransaction(txDetails, this.fundAccount.privateKey)
    await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    return rcHelper.waitForEthBalance(this.web3, address, balance => numberToBN(balance).gte(topup))
  },

  topUpERC20: async function (amount, address) {
    console.log(`Not enough Root chain erc20 tokens in faucet ${address}, attempting to top up with ${amount.toString()} tokens`)
    const txDetails = {
      from: this.fundAccount.address,
      to: this.erc20Contract._address,
      data: this.erc20Contract.methods.transfer(address, amount.toString()).encodeABI()
    }
    await rcHelper.setGas(this.web3.eth, txDetails)
    const signedTx = await this.web3.eth.accounts.signTransaction(txDetails, this.fundAccount.privateKey)
    await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    return rcHelper.waitForERC20Balance(this.web3, address, this.erc20ContractAddress, balance => numberToBN(balance).gte(amount))
  },

  fundChildchain: async function (address, amount, currency) {
    const ret = await ccHelper.send(
      this.childChain,
      this.faucetAccount.address,
      address,
      amount,
      currency,
      this.faucetAccount.privateKey,
      this.rootChain.plasmaContractAddress
    )
    console.log(`Faucet sent ${amount} ${currencyMap[currency] || currency} on childchain to ${address}`)
    return ret
  },

  fundRootchainEth: async function (address, amount) {
    if (amount <= 0) {
      return
    }
    const txDetails = {
      from: this.faucetAccount.address,
      to: address,
      value: amount
    }
    const ret = await rcHelper.sendTransaction(this.web3, txDetails, this.faucetAccount.privateKey)
    console.log(`Faucet sent ${amount / 10 ** 18} ETH on root chain to ${address}`)
    return ret
  },

  fundRootchainERC20: async function (address, amount) {
    if (amount <= 0) {
      return
    }
    const balance = await getErc20Balance({
      web3: this.web3,
      erc20Address: this.erc20ContractAddress,
      address: this.faucetAccount.address
    })
    if (numberToBN(balance).lt(numberToBN(amount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpERC20(amount, this.faucetAccount.address)
    }
    const txDetails = {
      from: this.faucetAccount.address,
      to: this.erc20ContractAddress,
      data: this.erc20Contract.methods.transfer(address, amount.toString()).encodeABI()
    }
    return rcHelper.sendTransaction(this.web3, txDetails, this.faucetAccount.privateKey)
  },

  returnFunds: async function (account) {
    return Promise.all([
      this.returnChildchainFunds(account),
      this.returnRootchainFunds(account)
    ])
  },

  returnChildchainFunds: async function (account) {
    const balances = await this.childChain.getBalance(account.address)
    return Promise.all(balances.map(async (balance) => {
      const ret = await ccHelper.send(
        this.childChain,
        account.address,
        this.faucetAccount.address,
        balance.amount,
        balance.currency,
        account.privateKey,
        this.rootChain.plasmaContractAddress
      )
      console.log(`${account.address} returned ${balance.amount} ${balance.currency} to faucet on childchain`)
      return ret
    }))
  },

  returnRootchainFunds: async function (account) {
    const balance = await this.web3.eth.getBalance(account.address)
    if (balance.toString() !== '0') {
      const txDetails = {
        from: account.address,
        to: this.faucetAccount.address
      }

      // Check that the account's balance isn't less than the gas it would cost to send the transaction
      await rcHelper.setGas(this.web3.eth, txDetails)
      const txGas = numberToBN(txDetails.gas).mul(numberToBN(txDetails.gasPrice))
      const txValue = numberToBN(balance).sub(txGas)
      if (txValue.gt(0)) {
        txDetails.value = txValue
        const ret = await rcHelper.sendTransaction(this.web3, txDetails, account.privateKey)
        console.log(`${account.address} returned ${txValue} ETH to faucet on root chain`)
        return ret
      }
    }
  }
}

module.exports = faucet
