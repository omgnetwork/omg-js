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

// NB This test is designed to run against a modified RootChain contract that allows exits after 20 seconds.
const CHALLENGE_PERIOD = 20 * 1000

describe('Deposit exit tests', async () => {
  const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
  const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
  let aliceAccount

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    // Create and fund Alice's account
    aliceAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_ALICE_AMOUNT)
    console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
    // Alice deposits ETH into the Plasma contract
    await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
    console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
  })

  it('should succesfully exit a deposit from the ChildChain', async () => {
    // Alice wants to exit without having transacted on the childchain

    // Get Alice's deposit utxo
    const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
    assert.equal(aliceUtxos.length, 1)
    assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

    const depositPos = childChain.encodeUtxoPos(aliceUtxos[0])

    // Start a deposit exit using the deposit utxo
    let receipt = await rootChain.startDepositExit(
      aliceAccount.address,
      depositPos.toString(),
      ETH_CURRENCY,
      DEPOSIT_AMOUNT,
      aliceAccount.privateKey
    )
    console.log(`Alice called RootChain.startDepositExit(): txhash = ${receipt.transactionHash}`)

    // Call finalize exits before the challenge period is over
    receipt = await rootChain.finalizeExits(aliceAccount.address, ETH_CURRENCY, 0, 1, aliceAccount.privateKey)
    console.log(`Alice called RootChain.finalizeExits() before challenge period: txhash = ${receipt.transactionHash}`)

    // Get Alice's ETH balance
    let aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Expect Alice's balance to be less than INTIIAL_ALICE_AMOUNT - DEPOSIT_AMOUNT because the exit has not been processed yet
    let expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(web3.utils.toBN(DEPOSIT_AMOUNT))
    assert.isBelow(Number(aliceEthBalance), Number(expected.toString()))

    // Wait for challenge period
    console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
    await helper.sleep(CHALLENGE_PERIOD)

    // Call finalize exits again
    receipt = await rootChain.finalizeExits(aliceAccount.address, ETH_CURRENCY, 0, 1, aliceAccount.privateKey)
    console.log(`Alice called RootChain.finalizeExits() after challenge period: txhash = ${receipt.transactionHash}`)

    // Get Alice's ETH balance
    aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Expect Alice's balance to be greater than INTIIAL_ALICE_AMOUNT - (some gas)
    expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(web3.utils.toBN(100000000))
    assert.isAbove(Number(aliceEthBalance), Number(expected.toString()))
  })
})
