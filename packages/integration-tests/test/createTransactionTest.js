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

const config = require('../test-config')
const rcHelper = require('../helpers/rootChainHelper')
const ccHelper = require('../helpers/childChainHelper')
const faucet = require('../helpers/testFaucet')
const Web3 = require('web3')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(config.geth_url)
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
let rootChain

describe('Create transaction tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('create a single currency transaction', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    const FEE_AMOUNT = 10
    let aliceAccount
    let bobAccount

    before(async function () {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create and submit a single currency transaction', async function () {
      const payments = [{
        owner: bobAccount.address,
        currency: transaction.ETH_CURRENCY,
        amount: Number(TRANSFER_AMOUNT)
      }]

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: FEE_AMOUNT
      }

      const createdTx = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      // Get the transaction data
      const typedData = transaction.getTypedData(createdTx.transactions[0], rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey])
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be INTIIAL_ALICE_AMOUNT - TRANSFER_AMOUNT - FEE_AMOUNT
      const aliceBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 1)
      const expected = numberToBN(INTIIAL_ALICE_AMOUNT).sub(numberToBN(TRANSFER_AMOUNT)).subn(FEE_AMOUNT)
      assert.equal(aliceBalance[0].amount.toString(), expected.toString())
    })
  })

  describe('create a single currency transaction with no receiver', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    const FEE_AMOUNT = 10
    let aliceAccount

    before(async function () {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create a single currency transaction', async function () {
      const payments = [{
        currency: transaction.ETH_CURRENCY,
        amount: Number(TRANSFER_AMOUNT)
      }]

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: FEE_AMOUNT
      }

      const createdTx = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)
    })
  })

  describe('create a mixed currency transaction', function () {
    const ERC20_CURRENCY = config.testErc20Contract
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('0.001', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 3
    const TRANSFER_AMOUNT_ETH = numberToBN(web3.utils.toWei('0.0004', 'ether'))
    const TRANSFER_AMOUNT_ERC20 = 2
    const FEE_AMOUNT = 0
    let aliceAccount
    let bobAccount

    before(async function () {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 tokens to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create and submit a mixed currency transaction', async function () {
      const payments = [{
        owner: bobAccount.address,
        currency: transaction.ETH_CURRENCY,
        amount: Number(TRANSFER_AMOUNT_ETH)
      }, {
        owner: bobAccount.address,
        currency: ERC20_CURRENCY,
        amount: Number(TRANSFER_AMOUNT_ERC20)
      }]

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: FEE_AMOUNT
      }

      const createdTx = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      // Get the transaction data
      const typedData = transaction.getTypedData(createdTx.transactions[0], rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey, aliceAccount.privateKey])
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's ETH balance should be TRANSFER_AMOUNT_ETH
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT_ETH)
      // Bob's ERC20 balance should be TRANSFER_AMOUNT_ERC20
      balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT_ERC20, ERC20_CURRENCY)
      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: transaction.ETH_CURRENCY, amount: Number(TRANSFER_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY, amount: TRANSFER_AMOUNT_ERC20 })

      // Check Alice's balance
      balance = await childChain.getBalance(aliceAccount.address)
      assert.equal(balance.length, 2)
      const expectedEth = numberToBN(INTIIAL_ALICE_AMOUNT_ETH).sub(numberToBN(TRANSFER_AMOUNT_ETH)).subn(FEE_AMOUNT)
      assert.deepInclude(balance, { currency: transaction.ETH_CURRENCY, amount: Number(expectedEth.toString()) })
      const expectedErc20 = numberToBN(INTIIAL_ALICE_AMOUNT_ERC20).sub(numberToBN(TRANSFER_AMOUNT_ERC20))
      assert.deepInclude(balance, { currency: ERC20_CURRENCY, amount: Number(expectedErc20.toString()) })
    })
  })

  describe('create an incomplete transaction', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    // const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    const FEE_AMOUNT = 0
    let aliceAccount
    let bobAccount

    before(async function () {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT / 2, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT / 2)
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT / 2, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      // Split alice's utxos so that she won't be able to send to Bob in one transaction
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      await ccHelper.splitUtxo(childChain, rootChain.plasmaContractAddress, aliceAccount, utxos[0], 4)
      await ccHelper.splitUtxo(childChain, rootChain.plasmaContractAddress, aliceAccount, utxos[1], 4)
      // Wait for the split txs to finalise
      await ccHelper.waitNumUtxos(childChain, aliceAccount.address, 8)
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create an incomplete transaction', async function () {
      const payments = [{
        owner: bobAccount.address,
        currency: transaction.ETH_CURRENCY,
        amount: Number(INTIIAL_ALICE_AMOUNT)
      }]

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: FEE_AMOUNT
      }

      const createdTx = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx.result, 'intermediate')
      assert.equal(createdTx.transactions.length, 2)

      // Send the intermediate transactions
      await Promise.all(createdTx.transactions.map(tx => {
        // Get the transaction data
        const typedData = transaction.getTypedData(tx, rootChain.plasmaContractAddress)
        // Sign it
        const privateKeys = new Array(tx.inputs.length).fill(aliceAccount.privateKey)
        const signatures = childChain.signTransaction(typedData, privateKeys)
        // Build the signed transaction
        const signedTx = childChain.buildSignedTransaction(typedData, signatures)
        // Submit the signed transaction to the childchain
        return childChain.submitTransaction(signedTx)
      }))

      // Wait for the intermediate transactions.
      await ccHelper.waitNumUtxos(childChain, aliceAccount.address, 2)

      // Try createTransaction again
      const createdTx2 = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx2.result, 'complete')
      assert.equal(createdTx2.transactions.length, 1)

      // Get the transaction data
      const typedData = transaction.getTypedData(createdTx2.transactions[0], rootChain.plasmaContractAddress)
      // Sign it
      const privateKeys = new Array(createdTx2.transactions[0].inputs.length).fill(aliceAccount.privateKey)
      const signatures = childChain.signTransaction(typedData, privateKeys)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be INTIIAL_ALICE_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, INTIIAL_ALICE_AMOUNT)
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), INTIIAL_ALICE_AMOUNT)

      // Alice's balance should be 0
      const aliceBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 0)
    })
  })

  describe('create a transaction to split utxos', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    let aliceAccount

    before(async function () {
      // Create Alice accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should split a utxo into 4', async function () {
      const utxos = await childChain.getUtxos(aliceAccount.address)
      const utxo = utxos[0]
      const div = Math.floor(utxo.amount / 4)
      const payments = new Array(4).fill().map(x => ({
        owner: aliceAccount.address,
        currency: transaction.ETH_CURRENCY,
        amount: div
      }))

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: 0
      }

      const createdTx = await childChain.createTransaction(
        aliceAccount.address,
        payments,
        fee,
        transaction.NULL_METADATA
      )
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      // Get the transaction data
      const typedData = transaction.getTypedData(createdTx.transactions[0], rootChain.plasmaContractAddress)
      // Sign it
      const privateKeys = new Array(createdTx.transactions[0].inputs.length).fill(aliceAccount.privateKey)
      const signatures = childChain.signTransaction(typedData, privateKeys)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Wait for the split tx to finalise, Alice should now have 4 utxos
      await ccHelper.waitNumUtxos(childChain, aliceAccount.address, 4)
    })
  })
})
