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

const config = require('../test-config')
const helper = require('./helper')
const Web3 = require('web3')
const erc20abi = require('human-standard-token-abi')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(config.geth_url)
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

describe('Deposit tests', async () => {
  before(async () => {
    const plasmaContract = await helper.getPlasmaContractAddress(config)
    rootChain = new RootChain(config.geth_url, plasmaContract.contract_addr)
  })

  describe('deposit ETH', async () => {
    let account

    before(async () => {
      // Create and fund a new account
      account = await helper.createAndFundAccount(web3, config, web3.utils.toWei('.1', 'ether'))
      console.log(`Created new account ${JSON.stringify(account)}`)
    })

    after(async () => {
      // Send back any leftover eth
      helper.returnFunds(web3, config, account)
    })

    it('should deposit ETH to the Plasma contract', async () => {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(account.address)
      assert.equal(initialBalance.length, 0)

      const TEST_AMOUNT = web3.utils.toWei('.0001', 'ether')
      console.log(TEST_AMOUNT)

      // Create the deposit transaction
      const depositTx = transaction.encodeDeposit(account.address, TEST_AMOUNT, transaction.ETH_CURRENCY)
      console.log(depositTx)

      // Deposit ETH into the Plasma contract
      await rootChain.depositEth(depositTx, TEST_AMOUNT, { from: account.address, privateKey: account.privateKey })

      // Wait for transaction to be mined and reflected in the account's balance
      const balance = await helper.waitForBalance(childChain, account.address, TEST_AMOUNT)

      // Check balance is correct
      assert.equal(balance[0].currency, transaction.ETH_CURRENCY)
      assert.equal(balance[0].amount.toString(), TEST_AMOUNT)
      console.log(`Balance: ${balance[0].amount.toString()}`)

      // THe account should have one utxo on the child chain
      const utxos = await childChain.getUtxos(account.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), TEST_AMOUNT)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)
    })
  })

  describe.skip('deposit ERC20', async () => {
    let account
    const testErc20Contract = new web3.eth.Contract(erc20abi, config.testErc20Contract)
    const INITIAL_AMOUNT = 100
    const DEPOSIT_AMOUNT = 20

    before(async () => {
      // Create and fund a new account
      account = await helper.createAndFundAccount(web3, config, web3.utils.toWei('.1', 'ether'))
      console.log(`Created new account ${JSON.stringify(account)}`)
      // Send ERC20 tokens to the new account
      const accounts = await web3.eth.getAccounts()
      await helper.fundAccountERC20(web3, testErc20Contract, accounts[0], config.fundAccountPw, account.address, INITIAL_AMOUNT)
    })

    after(async () => {
      // Send back any leftover eth
      helper.returnFunds(web3, config, account)
    })

    it('should deposit ERC20 tokens to the Plasma contract', async () => {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(account.address)
      assert.equal(initialBalance.length, 0)

      // Account must approve the Plasma contract
      await helper.approveERC20(web3, testErc20Contract, account.address, account.privateKey, rootChain.plasmaContractAddress, DEPOSIT_AMOUNT)

      // Create the deposit transaction
      const depositTx = transaction.encodeDeposit(account.address, DEPOSIT_AMOUNT, config.testErc20Contract)

      // Deposit ERC20 tokens into the Plasma contract
      await rootChain.depositToken(depositTx, { from: account.address, privateKey: account.privateKey })

      // Wait for transaction to be mined and reflected in the account's balance
      const balance = await helper.waitForBalance(childChain, account.address, DEPOSIT_AMOUNT, config.testErc20Contract)

      // Check balance is correct
      assert.equal(balance[0].amount.toString(), DEPOSIT_AMOUNT)
      console.log(`Balance: ${balance[0].amount.toString()}`)

      // THe account should have one utxo on the child chain
      const utxos = await childChain.getUtxos(account.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(utxos[0].currency, config.testErc20Contract)
    })
  })
})
