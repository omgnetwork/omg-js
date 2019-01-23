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

describe.only('Standard Exit tests', async () => {
  describe('Deposit transaction exit', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
    let aliceAccount

    before(async () => {
      const accounts = await web3.eth.getAccounts()
      // Assume the funding account is accounts[0] and has a blank password
      // Create and fund Alice's account
      aliceAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_ALICE_AMOUNT)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
    })

    it('should succesfully exit a deposit', async () => {
      // Alice deposits ETH into the Plasma contract
      let receipt = await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)

      // Keep track of how much Alice spends on gas
      let aliceSpentOnGas = await helper.spentOnGas(web3, receipt)
      console.log(`aliceSpentOnGas = ${aliceSpentOnGas}`)

      // Alice wants to exit without having transacted on the childchain

      // Get Alice's deposit utxo
      const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 1)
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

      // Get the exit data
      const utxoToExit = aliceUtxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      receipt = await rootChain.startStandardExit(
        exitData.utxo_pos,
        exitData.txbytes,
        exitData.proof,
        {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      )
      console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)
      aliceSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

      // Call processExits before the challenge period is over
      receipt = await rootChain.processExits(
        ETH_CURRENCY,
        0,
        1,
        {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      )
      console.log(`Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
      aliceSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

      // Get Alice's ETH balance
      let aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be less than INTIIAL_ALICE_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(aliceEthBalance), Number(INTIIAL_ALICE_AMOUNT))

      // Wait for challenge period
      console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
      await helper.sleep(CHALLENGE_PERIOD + 1000) // Wait an extra second to give the exit time to process.

      // Call processExits again.
      receipt = await rootChain.processExits(
        ETH_CURRENCY,
        0,
        1,
        {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      )
      console.log(`Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
      aliceSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

      // Get Alice's ETH balance
      aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(aliceSpentOnGas)
      assert.equal(aliceEthBalance.toString(), expected.toString())
    })
  })

  describe('childchain transaction exit', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
    const INTIIAL_BOB_AMOUNT = web3.utils.toWei('1', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.2', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
    // Create Alice and Bob's accounts
    // Assume the funding account is accounts[0] and has a blank password
      const accounts = await web3.eth.getAccounts()
    ;[aliceAccount, bobAccount] = await helper.createAndFundManyAccounts(web3, accounts[0], '', [INTIIAL_ALICE_AMOUNT, INTIIAL_BOB_AMOUNT])
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Alice deposits ETH into the Plasma contract
      await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
    })

    it('should succesfully exit a ChildChain transaction', async () => {
    // Send TRANSFER_AMOUNT from Alice to Bob
      await helper.sendAndWait(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        Number(TRANSFER_AMOUNT),
        ETH_CURRENCY,
        [aliceAccount.privateKey],
        TRANSFER_AMOUNT
      )

      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // Bob wants to exit
      const bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 1)
      assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

      // Get the exit data
      const utxoToExit = bobUtxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'sigs', 'proof', 'utxo_pos'])

      let receipt = await rootChain.startStandardExit(
        exitData.utxo_pos,
        exitData.txbytes,
        exitData.proof,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      let bobSpentOnGas = await helper.spentOnGas(web3, receipt)

      // Call processExits before the challenge period is over
      receipt = await rootChain.processExits(
        ETH_CURRENCY,
        0,
        1,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_AMOUNT))

      // Wait for challenge period
      console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
      await helper.sleep(CHALLENGE_PERIOD + 1000) // Wait an extra second to give the exit time to process.

      // Call processExits again.
      receipt = await rootChain.processExits(
        ETH_CURRENCY,
        0,
        1,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

      // Get Bob's ETH balance
      bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils.toBN(INTIIAL_BOB_AMOUNT)
        .add(web3.utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })
})
