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
const rcHelper = require('../helpers/rootChainHelper')
const ccHelper = require('../helpers/childChainHelper')
const faucet = require('../helpers/testFaucet')
const Web3 = require('web3')
const erc20abi = require('human-standard-token-abi')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

describe('Deposit tests', async () => {
  before(async () => {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('deposit ETH (ci-enabled)', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TEST_AMOUNT = web3.utils.toWei('.0001', 'ether')
    let aliceAccount

    before(async () => {
      // Create and fund a new account
      aliceAccount = await rcHelper.createAccount(web3)
      console.log(`Created new account ${JSON.stringify(aliceAccount)}`)
      await faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should deposit ETH to the Plasma contract', async () => {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(initialBalance.length, 0)

      // Create the deposit transaction
      const depositTx = transaction.encodeDeposit(aliceAccount.address, TEST_AMOUNT, transaction.ETH_CURRENCY)
      console.log(depositTx)

      // Deposit ETH into the Plasma contract
      await rootChain.depositEth(depositTx, TEST_AMOUNT, { from: aliceAccount.address, privateKey: aliceAccount.privateKey })

      // Wait for transaction to be mined and reflected in the account's balance
      const balance = await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, TEST_AMOUNT)

      // Check balance is correct
      assert.equal(balance[0].currency, transaction.ETH_CURRENCY)
      assert.equal(balance[0].amount.toString(), TEST_AMOUNT)
      console.log(`Balance: ${balance[0].amount.toString()}`)

      // THe account should have one utxo on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), TEST_AMOUNT)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)
    })
  })

  describe('deposit ERC20 (ci-enabled)', async () => {
    let aliceAccount
    const testErc20Contract = new web3.eth.Contract(erc20abi, config.testErc20Contract)
    const INTIIAL_AMOUNT_ETH = web3.utils.toWei('.1', 'ether')
    const INITIAL_AMOUNT_ERC20 = 10
    const TEST_AMOUNT = 2

    before(async () => {
      // Create and fund Alice's account
      aliceAccount = await rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      await faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_AMOUNT_ETH)
      await faucet.fundRootchainERC20(web3, aliceAccount.address, INITIAL_AMOUNT_ERC20, testErc20Contract)

      await Promise.all([
        rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_AMOUNT_ETH),
        rcHelper.waitForERC20BalanceEq(web3, aliceAccount.address, config.testErc20Contract, INITIAL_AMOUNT_ERC20)
      ])
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should deposit ERC20 tokens to the Plasma contract', async () => {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(initialBalance.length, 0)

      // Account must approve the Plasma contract
      await rcHelper.approveERC20(web3, testErc20Contract, aliceAccount.address, aliceAccount.privateKey, rootChain.plasmaContractAddress, TEST_AMOUNT)

      // Create the deposit transaction
      const depositTx = transaction.encodeDeposit(aliceAccount.address, TEST_AMOUNT, config.testErc20Contract)

      // Deposit ERC20 tokens into the Plasma contract
      await rootChain.depositToken(depositTx, { from: aliceAccount.address, privateKey: aliceAccount.privateKey })

      // Wait for transaction to be mined and reflected in the account's balance
      const balance = await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, TEST_AMOUNT, config.testErc20Contract)

      // Check balance is correct
      assert.equal(balance[0].amount.toString(), TEST_AMOUNT)
      console.log(`Balance: ${balance[0].amount.toString()}`)

      // THe account should have one utxo on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), TEST_AMOUNT)
      assert.equal(utxos[0].currency, config.testErc20Contract)
    })
  })
})
