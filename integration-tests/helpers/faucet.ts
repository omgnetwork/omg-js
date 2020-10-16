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

import Web3 from 'web3';
import web3Utils from 'web3-utils';
import erc20abi from 'human-standard-token-abi';
import BN from 'bn.js';

import OmgJS from '../..';

import * as ccHelper from './childChainHelper';
import * as rcHelper from './rootChainHelper';
import config from '../test-config';

const currencyMap = {
  '0x0000000000000000000000000000000000000000': 'wei'
}

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});
const erc20Contract = new omgjs.web3Instance.eth.Contract(erc20abi, config.erc20_contract_address);

export default {
  fundAccount: null,
  init: async function ({
    faucetName,
    topup = true
  }) {
    this.faucetAccount = this.createAccountFromString(faucetName, config.faucet_salt);
    this.fundAccount = {
      address: config.fund_account,
      privateKey: config.fund_account_private_key
    };

    if (topup) {
      await this.initEthBalance(web3Utils.toWei(config.min_amount_eth_per_test, 'ether'), config.topup_multipler)
      await this.initERC20Balance(config.min_amount_erc20_per_test, config.topup_multipler)
      await this.addToken(config.erc20_contract_address)
      await this.addToken(OmgJS.currency.ETH)
      await this.showInfo()
    }
  },

  createAccountFromString: function (string: string, salt: string = '') {
    const privateKey = web3Utils.sha3(`${string}${salt}`)
    const account = omgjs.web3Instance.eth.accounts.privateKeyToAccount(privateKey)
    return { address: account.address, privateKey: account.privateKey }
  },

  addToken: async function (currency: string) {
    const hasToken = await omgjs.hasExitQueue(currency);
    if (!hasToken) {
      console.log(`Adding ${currency} to exit queue`)
      return omgjs.addExitQueue({
        currency,
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
    console.info(`ERC20 token: ${config.erc20_contract_address}`)
    console.info(`Rootchain ETH balance: ${await omgjs.web3Instance.eth.getBalance(this.faucetAccount.address)}`)
    console.info(`Rootchain ERC20 balance: ${await omgjs.getRootchainERC20Balance({ erc20Address: config.erc20_contract_address, address: this.faucetAccount.address })}`)

    const ccBalance = await omgjs.getBalance(this.faucetAccount.address)
    const ccEthBalance = ccBalance.find(e => e.currency === OmgJS.currency.ETH)
    const ccErc20Balance = ccBalance.find(e => e.currency.toLowerCase() === config.erc20_contract_address.toLowerCase())

    console.info(`Childchain ETH balance: ${ccEthBalance ? ccEthBalance.amount.toString() : '0'}`)
    console.info(`Childchain ERC20 balance: ${ccErc20Balance ? ccErc20Balance.amount.toString() : '0'}`)
    console.info('------------------------------------------------')
  },

  initEthBalance: async function (minAmount, topupMultipler) {
    if (new BN(minAmount.toString()).eqn(0)) {
      return;
    }

    const topupAmount = new BN((minAmount * topupMultipler).toString())

    // Check that the faucet has enough childchain funds to run the tests
    const ccBalance = await omgjs.getBalance(this.faucetAccount.address)
    const ccEthBalance = ccBalance.find(e => e.currency === OmgJS.currency.ETH)
    if (!ccEthBalance || new BN(ccEthBalance.amount.toString()).lt(new BN(minAmount.toString()))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccEthBalance ? topupAmount.sub(new BN(ccEthBalance.amount.toString())) : topupAmount

      // Check if there are enough root chain funds in the faucet
      const rcEthBalance = await omgjs.getRootchainETHBalance(this.faucetAccount.address)
      if (new BN(rcEthBalance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpEth(needed, this.faucetAccount.address)
      }

      try {
        console.log(`Not enough Child chain ETH in faucet ${this.faucetAccount.address}, attempting to deposit ${needed.toString()} ETH from root chain`)
        await omgjs.deposit({
          amount: needed,
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey
          }
        })
        await ccHelper.waitForBalance(
          this.faucetAccount.address,
          OmgJS.currency.ETH,
          balance => new BN(balance.amount).gte(new BN(topupAmount))
        )
        console.log(`Test faucet ${this.faucetAccount.address} topped up with ${needed.toString()} ETH`)
      } catch (err) {
        console.warn(`Error topping up faucet ${this.faucetAccount.address}`)
        throw err
      }
    }

    // Check if there are still enough root chain funds in the faucet
    const rcEthBalance = await omgjs.getRootchainETHBalance(this.faucetAccount.address)
    if (new BN(rcEthBalance).lt(new BN(minAmount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpEth(topupAmount, this.faucetAccount.address)
    }
  },

  initERC20Balance: async function (minAmount, topupMultipler) {
    if (new BN(minAmount).eqn(0)) {
      return
    }

    const topupAmount = new BN(minAmount * topupMultipler)

    // Check that the faucet has enough funds to run the tests
    const ccBalances = await omgjs.getBalance(this.faucetAccount.address)
    const ccCurrencyBalance = ccBalances.find(e => e.currency === config.erc20_contract_address)
    if (!ccCurrencyBalance || new BN(ccCurrencyBalance.amount).lt(new BN(minAmount))) {
      // If not, try to deposit more funds from the root chain
      const needed = ccCurrencyBalance ? topupAmount.sub(new BN(ccCurrencyBalance.amount)) : topupAmount
      // Check if there are enough root chain funds in the faucet
      const erc20Balance = await omgjs.getRootchainERC20Balance({ erc20Address: config.erc20_contract_address, address: this.faucetAccount.address })
      if (new BN(erc20Balance).lt(needed)) {
        // For local testing, try to automatically top up the faucet
        await this.topUpERC20(needed, this.faucetAccount.address)
      }

      try {
        console.log(`Not enough Child chain erc20 tokens in faucet ${this.faucetAccount.address}, attempting to deposit ${needed.toString()} ${config.erc20_contract_address} from root chain`)
        await omgjs.approveERC20Deposit({
          erc20Address: config.erc20_contract_address,
          amount: needed.toNumber(),
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey,
            gasLimit: 6000000
          }
        })
        const { address: erc20VaultAddress } = await omgjs.getErc20Vault()
        const allowed = await erc20Contract.methods.allowance(this.faucetAccount.address, erc20VaultAddress).call()
        if (allowed === '0') {
          throw new Error('ERC20 approval failed!')
        }
        await omgjs.deposit({
          amount: needed.toNumber(),
          currency: config.erc20_contract_address,
          txOptions: {
            from: this.faucetAccount.address,
            privateKey: this.faucetAccount.privateKey
          }
        })
        await ccHelper.waitForBalance(
          this.faucetAccount.address,
          config.erc20_contract_address,
          balance => new BN(balance.amount).gte(new BN(topupAmount))
        )
        console.log(`Test faucet ${this.faucetAccount.address} topped up with ${needed.toString()} ${config.erc20_contract_address}`)
      } catch (err) {
        console.error(`Error depositing ${needed.toString()} ${config.erc20_contract_address} - not enough tokens in faucet?`)
        throw err
      }
    }
  },

  topUpEth: async function (amount, address) {
    const topup = new BN(amount).add(new BN(web3Utils.toWei('0.1', 'ether'))) // A bit extra for gas
    console.log(`Not enough Root chain ETH in faucet ${address}, attempting to top up with ${topup.toString()}`)
    const txDetails = {
      from: this.fundAccount.address,
      to: address,
      value: topup
    }
    await rcHelper.setGas(txDetails)
    const signedTx = await omgjs.web3Instance.eth.accounts.signTransaction(txDetails, this.fundAccount.privateKey)
    await omgjs.web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction)
    return rcHelper.waitForEthBalance(address, balance => new BN(balance).gte(topup))
  },

  topUpERC20: async function (amount, address) {
    console.log(`Not enough Root chain erc20 tokens in faucet ${address}, attempting to top up with ${amount.toString()} tokens`)
    const txDetails = {
      from: this.fundAccount.address,
      to: (erc20Contract as any)._address,
      data: erc20Contract.methods.transfer(address, amount.toString()).encodeABI()
    }
    await rcHelper.setGas(txDetails)
    const signedTx = await omgjs.web3Instance.eth.accounts.signTransaction(txDetails, this.fundAccount.privateKey)
    await omgjs.web3Instance.eth.sendSignedTransaction(signedTx.rawTransaction)
    return rcHelper.waitForERC20Balance(address, config.erc20_contract_address, balance => new BN(balance).gte(amount))
  },

  fundChildchain: async function (address, amount, currency) {
    const ret = await ccHelper.send(
      this.faucetAccount.address,
      address,
      amount,
      currency,
      this.faucetAccount.privateKey
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
    const ret = await rcHelper.sendTransaction(txDetails, this.faucetAccount.privateKey)
    console.log(`Faucet sent ${amount / 10 ** 18} ETH on root chain to ${address}`)
    return ret
  },

  fundRootchainERC20: async function (address, amount) {
    if (amount <= 0) {
      return
    }
    const balance = await omgjs.getRootchainERC20Balance({
      erc20Address: config.erc20_contract_address,
      address: this.faucetAccount.address
    })
    if (new BN(balance).lt(new BN(amount))) {
      // For local testing, try to automatically top up the faucet
      await this.topUpERC20(amount, this.faucetAccount.address)
    }
    const txDetails = {
      from: this.faucetAccount.address,
      to: config.erc20_contract_address,
      data: erc20Contract.methods.transfer(address, amount.toString()).encodeABI()
    }
    return rcHelper.sendTransaction(txDetails, this.faucetAccount.privateKey)
  },

  returnFunds: function (from, to?: string) {
    return this.returnRootchainFunds(from, to)
    // we don't return childchain fund because it messed up the utxo
    // return Promise.all([
    //   this.returnChildchainFunds(from, to),
    //   this.returnRootchainFunds(from, to)
    // ])
  },

  returnChildchainFunds: async function (from, to = this.faucetAccount) {
    const balances = await omgjs.getBalance(from.address)
    for (const balance of balances) {
      if (balance.currency === OmgJS.currency.ETH) {
        const fees = (await omgjs.getFees())['1']
        const { amount: feeEthAmountWei } = fees.find(f => f.currency === OmgJS.currency.ETH)
        await ccHelper.send(
          from.address,
          to.address,
          new BN(balance.amount).sub(new BN(feeEthAmountWei)),
          balance.currency,
          from.privateKey
        ).catch(e => {
          console.log(`Error returning childchain funds from ${from.address}: ${e.message}`)
        })
      } else {
        // skip returning fund for erc20 now due to fee
        // await ccHelper.send(
        //   omgjs,
        //   from.address,
        //   to.address,
        //   balance.amount,
        //   balance.currency,
        //   from.privateKey,
        //   omgjs.plasmaContractAddress
        // )
      }
    }
  },

  returnRootchainFunds: async function (from, to = this.faucetAccount) {
    try {
      const balance = await omgjs.web3Instance.eth.getBalance(from.address)
      if (balance.toString() !== '0') {
        const txDetails = {
          from: from.address,
          to: to.address,
          gas: null,
          gasPrice: null
        }
        // Check that the from account's balance isn't less than the gas it would cost to send the transaction
        await rcHelper.setGas(txDetails)
        const txGas = new BN(txDetails.gas).mul(new BN(txDetails.gasPrice))
        const txValue = new BN(balance).sub(txGas)
        if (txValue.gt(new BN(0))) {
          const newTxValue = { ...txDetails, value: txValue }
          await rcHelper.sendTransaction(newTxValue, from.privateKey)
          console.log(`${from.address} returned ${txValue} ETH to ${to.address} on root chain`)
        } else {
          console.log(`${from.address} doesn't have enough balance to cover return gas costs`)
        }
      }
    } catch (err) {
      console.log(`Error returning rootchain funds from ${from.address}: ${err.message}`)
    }
  }
}
