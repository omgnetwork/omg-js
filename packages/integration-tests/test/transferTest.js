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
const chai = require('chai')
const assert = chai.assert

const GETH_URL = `http://${config.geth.host}:${config.geth.port}`
const web3 = new Web3(GETH_URL)
const childChain = new ChildChain(`http://${config.watcher.host}:${config.watcher.port}`, `http://${config.childchain.host}:${config.childchain.port}`)
const rootChain = new RootChain(GETH_URL, config.plasmaContract)
const ETH_CURRENCY = '0000000000000000000000000000000000000000'

describe('Transfer tests', async () => {
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
    assert.equal(utxos[0].currency, ETH_CURRENCY)

    // Convert 'amount' to a Number
    utxos[0].amount = Number(utxos[0].amount)
    const CHANGE_AMOUNT = utxos[0].amount - TRANSFER_AMOUNT
    const txBody = {
      inputs: [utxos[0]],
      outputs: [{
        owner: bobAccount.address,
        currency: ETH_CURRENCY,
        amount: Number(TRANSFER_AMOUNT)
      }, {
        owner: aliceAccount.address,
        currency: ETH_CURRENCY,
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
