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

describe('Exit tests', async () => {
  const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
  const INTIIAL_BOB_AMOUNT = web3.utils.toWei('1', 'ether')
  const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
  const TRANSFER_AMOUNT = web3.utils.toWei('0.2', 'ether')
  let aliceAccount
  let bobAccount

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    // Create and fund Alice's account
    aliceAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_ALICE_AMOUNT)
    console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
    // Create Bob's account
    bobAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_BOB_AMOUNT)
    console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
    // Alice deposits ETH into the Plasma contract
    await rootChain.depositEth(DEPOSIT_AMOUNT, aliceAccount.address, aliceAccount.privateKey)
    // Wait for transaction to be mined
    const balance = await helper.waitForBalance(childChain, aliceAccount.address, DEPOSIT_AMOUNT)
    assert.equal(balance[0].amount.toString(), DEPOSIT_AMOUNT)
    console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
  })

  it('should succesfully exit from the ChildChain', async () => {
    // Send TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(childChain, aliceAccount.address, bobAccount.address, Number(TRANSFER_AMOUNT), [aliceAccount.privateKey], TRANSFER_AMOUNT)
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

    // Bob wants to exit
    const bobUtxos = await childChain.getUtxos(bobAccount.address)
    assert.equal(bobUtxos.length, 1)
    assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

    const utxoToExit = bobUtxos[0]
    const exitData = await childChain.getExitData(utxoToExit)
    assert.hasAllKeys(exitData, ['txbytes', 'sigs', 'proof', 'utxo_pos'])

    let receipt = await rootChain.startExit(
      bobAccount.address,
      exitData.utxo_pos.toString(),
      exitData.txbytes,
      exitData.proof,
      exitData.sigs,
      bobAccount.privateKey
    )
    console.log(`Bob called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

    // Wait for challenge period
    console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
    await helper.sleep(CHALLENGE_PERIOD)

    // Call finalize exits.
    receipt = await rootChain.finalizeExits(bobAccount.address, ETH_CURRENCY, bobAccount.privateKey)
    console.log(`Bob called RootChain.finalizeExits(): txhash = ${receipt.transactionHash}`)

    // Get Bob's ETH balance
    const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
    // Expect Bob's balance to be greater than INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - (some gas)
    const expected = web3.utils.toBN(INTIIAL_BOB_AMOUNT).add(web3.utils.toBN(TRANSFER_AMOUNT)).sub(web3.utils.toBN(100000000))
    assert.isAbove(Number(bobEthBalance), Number(expected.toString()))
  })
})
