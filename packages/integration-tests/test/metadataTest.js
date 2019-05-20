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
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert
const ethUtil = require('ethereumjs-util')

const web3 = new Web3(config.geth_url)
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

describe('Metadata tests', async () => {
  before(async () => {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('String as metadata', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should add metadata to a transaction', async () => {
      const METADATA = 'Hello สวัสดี'

      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction(
        aliceAccount.address,
        utxos,
        [aliceAccount.privateKey],
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        transaction.encodeMetadata(METADATA),
        rootChain.plasmaContractAddress
      )
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      const decoded = transaction.decodeMetadata(tx.metadata)
      assert.equal(decoded, METADATA)
    })
  })

  describe('sha256 as metadata', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should add 32 byte hash metadata to a transaction', async () => {
      const METADATA = 'Hello สวัสดี'
      const hash = ethUtil.keccak256(METADATA)
      const hashString = `0x${hash.toString('hex')}`

      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction(
        aliceAccount.address,
        utxos,
        [aliceAccount.privateKey],
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        hashString,
        rootChain.plasmaContractAddress
      )
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      assert.equal(tx.metadata, hashString)
    })
  })

  describe('No metadata', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should send a transaction with NO metadata', async () => {
      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction(
        aliceAccount.address,
        utxos,
        [aliceAccount.privateKey],
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        null,
        rootChain.plasmaContractAddress
      )
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      assert.equal(tx.metadata, transaction.NULL_METADATA)
    })
  })
})
