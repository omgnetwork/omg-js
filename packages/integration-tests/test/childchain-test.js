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
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(`http://${config.geth.host}:${config.geth.port}`)
const childChain = new ChildChain(`http://${config.watcher.host}:${config.watcher.port}`)
const PLASMA_CONTRACT_ADDRESS = config.plasmaContract

describe('integration tests', async () => {
  let account

  before(async () => {
    // Create and fund a new account
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    account = await helper.createAndFundAccount(web3, accounts[0], '', web3.utils.toWei('2', 'ether'))
    console.log(`Created new account ${JSON.stringify(account)}`)
  })

  it('should deposit ETH to the Plasma contract', async () => {
    // The new account should have no initial balance
    const initialBalance = await childChain.getBalance(account.address)
    assert.equal(initialBalance.length, 0)

    // Deposit ETH into the Plasma contract
    const TEST_AMOUNT = web3.utils.toWei('1', 'ether')
    try {
      const signedTx = await web3.eth.accounts.signTransaction({
        from: account.address,
        to: PLASMA_CONTRACT_ADDRESS,
        value: TEST_AMOUNT,
        gas: 2000000,
        data: '0xd0e30db0'
      }, account.privateKey)

      await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    } catch (err) {
      console.error(err)
      throw err
    }

    // Wait for transaction to be mined and reflected in the account's balance
    const balance = await helper.waitForBalance(childChain, account.address, TEST_AMOUNT)
    console.log(`Balance: ${JSON.stringify(balance)}`)

    // Check balance is correct
    assert.equal(balance[0].currency, '0000000000000000000000000000000000000000')
    assert.equal(balance[0].amount.toString(), web3.utils.toWei('1', 'ether'))

    // THe account should have one utxo on the child chain
    const utxos = await childChain.getUtxos(account.address)
    assert.equal(utxos.length, 1)
    assert.hasAllKeys(utxos[0], ['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    assert.equal(utxos[0].amount.toString(), web3.utils.toWei('1', 'ether'))
    assert.equal(utxos[0].currency, '0000000000000000000000000000000000000000')
  })
})
