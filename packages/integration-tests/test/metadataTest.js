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
const chai = require('chai')
const assert = chai.assert
const ethUtil = require('ethereumjs-util')

describe('metadataTest.js (ci-enabled)', function () {
  const web3 = new Web3(config.eth_node)
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  let rootChain

  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('String as metadata', function () {
    let INTIIAL_ALICE_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should add metadata to a transaction', async function () {
      const METADATA = 'Hello สวัสดี'

      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        fromPrivateKeys: [aliceAccount.privateKey],
        payments: [{
          owner: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: TRANSFER_AMOUNT
        }],
        fee: {
          amount: 0,
          currency: transaction.ETH_CURRENCY
        },
        metadata: METADATA,
        verifyingContract: rootChain.plasmaContractAddress
      })
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      const decoded = transaction.decodeMetadata(tx.metadata)
      assert.equal(decoded, METADATA)
    })
  })

  describe('sha256 as metadata', function () {
    let INTIIAL_ALICE_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should add 32 byte hash metadata to a transaction', async function () {
      const METADATA = 'Hello สวัสดี'
      const hash = ethUtil.keccak256(METADATA)
      const hashString = `0x${hash.toString('hex')}`

      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        fromPrivateKeys: [aliceAccount.privateKey],
        payments: [{
          owner: bobAccount.address,
          amount: TRANSFER_AMOUNT,
          currency: transaction.ETH_CURRENCY
        }],
        fee: {
          amount: 0,
          currency: transaction.ETH_CURRENCY
        },
        metadata: hashString,
        verifyingContract: rootChain.plasmaContractAddress
      })
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      assert.equal(tx.metadata, hashString)
    })
  })

  describe('No metadata', function () {
    let INTIIAL_ALICE_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      // Give some ETH to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should send a transaction with NO metadata', async function () {
      const utxos = await childChain.getUtxos(aliceAccount.address)
      const result = await childChain.sendTransaction({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        fromPrivateKeys: [aliceAccount.privateKey],
        payments: [{
          owner: bobAccount.address,
          amount: TRANSFER_AMOUNT,
          currency: transaction.ETH_CURRENCY
        }],
        fee: {
          amount: 0,
          currency: transaction.ETH_CURRENCY
        },
        verifyingContract: rootChain.plasmaContractAddress
      })
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      const tx = await childChain.getTransaction(result.txhash)
      assert.equal(tx.metadata, transaction.NULL_METADATA)
    })
  })
})
