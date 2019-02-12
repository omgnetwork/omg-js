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
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(config.geth_url)
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

describe('Transfer tests', async () => {
  before(async () => {
    const plasmaContract = await helper.getPlasmaContractAddress(config.contract_exchanger_url)
    rootChain = new RootChain(config.geth_url, plasmaContract.contract_addr)
  })

  describe('Simple transfer', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.2', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      // Assume the funding account is accounts[0] and has a blank password
      const accounts = await web3.eth.getAccounts()
      ;[aliceAccount, bobAccount] = await helper.createAndFundManyAccounts(web3, accounts[0], '', [INTIIAL_ALICE_AMOUNT, 0])
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Alice deposits ETH into the Plasma contract
      await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
    })

    it('should transfer funds on the childchain', async () => {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)

      // Convert 'amount' to a Number
      utxos[0].amount = Number(utxos[0].amount)
      const CHANGE_AMOUNT = utxos[0].amount - TRANSFER_AMOUNT
      const txBody = {
        inputs: [utxos[0]],
        outputs: [{
          owner: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: Number(TRANSFER_AMOUNT)
        }, {
          owner: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: CHANGE_AMOUNT
        }]
      }

      // Create the unsigned transaction
      const unsignedTx = childChain.createTransaction(txBody)
      // Sign it
      const signatures = await childChain.signTransaction(unsignedTx, [aliceAccount.privateKey])
      assert.equal(signatures.length, 1)
      // Build the signed transaction
      const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await helper.waitForBalance(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be CHANGE_AMOUNT
      balance = await childChain.getBalance(aliceAccount.address)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), CHANGE_AMOUNT)
    })
  })

  describe('Transfer with 4 inputs and 4 outputs', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('3', 'ether')
    const INITIAL_BOB_AMOUNT = web3.utils.toWei('3', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      // Assume the funding account is accounts[0] and has a blank password
      const accounts = await web3.eth.getAccounts()
      ;[aliceAccount, bobAccount] = await helper.createAndFundManyAccounts(web3, accounts[0], '', [INTIIAL_ALICE_AMOUNT, INITIAL_BOB_AMOUNT])
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)

      // Alice and Bob both make 2 deposits to the RootChain (so they will get 2 utxos each)
      await Promise.all([
        helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey),
        helper.depositEthAndWait(rootChain, childChain, bobAccount.address, DEPOSIT_AMOUNT, bobAccount.privateKey)
      ])

      await Promise.all([
        helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey, DEPOSIT_AMOUNT * 2),
        helper.depositEthAndWait(rootChain, childChain, bobAccount.address, DEPOSIT_AMOUNT, bobAccount.privateKey, DEPOSIT_AMOUNT * 2)
      ])
    })

    it('should send a transaction with 4 inputs and 4 outputs', async () => {
      // Check Alice's utxos on the child chain
      let aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 2)
      assert.hasAllKeys(aliceUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(aliceUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(aliceUtxos[1].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(aliceUtxos[1].currency, transaction.ETH_CURRENCY)

      // Check Bob's utxos on the child chain
      let bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
      assert.hasAllKeys(bobUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(bobUtxos[0].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(bobUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(bobUtxos[1].amount.toString(), DEPOSIT_AMOUNT)
      assert.equal(bobUtxos[1].currency, transaction.ETH_CURRENCY)

      // Construct the transaction body using all 4 deposit utxos
      const inputs = [aliceUtxos[0], aliceUtxos[1], bobUtxos[0], bobUtxos[1]]

      // Split the transaction into 4 different outputs:
      // Alice gets 1.5 ether
      const ALICE_OUTPUT_0 = DEPOSIT_AMOUNT * 0.2
      const ALICE_OUTPUT_1 = DEPOSIT_AMOUNT * 1.3
      // Bob gets 2.5 ether
      const BOB_OUTPUT_0 = DEPOSIT_AMOUNT * 1
      const BOB_OUTPUT_1 = DEPOSIT_AMOUNT * 1.5

      const outputs = [
        {
          owner: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: ALICE_OUTPUT_0
        },
        {
          owner: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: ALICE_OUTPUT_1
        },
        {
          owner: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: BOB_OUTPUT_0
        },
        {
          owner: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: BOB_OUTPUT_1
        }
      ]

      // Create the unsigned transaction
      const unsignedTx = childChain.createTransaction({ inputs, outputs })
      // Sign it with the correct private key for each input
      const signatures = await childChain.signTransaction(
        unsignedTx,
        [
          aliceAccount.privateKey,
          aliceAccount.privateKey,
          bobAccount.privateKey,
          bobAccount.privateKey
        ]
      )
      assert.equal(signatures.length, 4)
      // Build the signed transaction
      const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Alice's balance should be ALICE_OUTPUT_0 + ALICE_OUTPUT_1
      const expected = web3.utils.toBN(ALICE_OUTPUT_0).add(web3.utils.toBN(ALICE_OUTPUT_1))
      let balance = await helper.waitForBalance(childChain, aliceAccount.address, expected)
      assert.equal(balance[0].amount.toString(), expected.toString())

      // Check Alice's utxos on the child chain again
      aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 2)
      assert.hasAllKeys(aliceUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(aliceUtxos[0].amount.toString(), ALICE_OUTPUT_0)
      assert.equal(aliceUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(aliceUtxos[1].amount.toString(), ALICE_OUTPUT_1)
      assert.equal(aliceUtxos[1].currency, transaction.ETH_CURRENCY)

      // Check Bob's utxos on the child chain again
      bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
      assert.hasAllKeys(bobUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(bobUtxos[0].amount.toString(), BOB_OUTPUT_0)
      assert.equal(bobUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(bobUtxos[1].amount.toString(), BOB_OUTPUT_1)
      assert.equal(bobUtxos[1].currency, transaction.ETH_CURRENCY)
    })
  })
})
