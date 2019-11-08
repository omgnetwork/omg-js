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
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

describe('Transfer tests', async () => {
  before(async () => {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('Simple ETH (ci-enabled-fast)', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    // TRANSFER_AMOUNT is deliberately bigger than Number.MAX_SAFE_INTEGER to cause rounding errors if not properly handled
    const TRANSFER_AMOUNT = '20000000000000123'
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

    it('should transfer ETH on the childchain', async () => {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), INTIIAL_ALICE_AMOUNT)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)

      const CHANGE_AMOUNT = numberToBN(utxos[0].amount).sub(numberToBN(TRANSFER_AMOUNT))
      const txBody = {
        inputs: [utxos[0]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: TRANSFER_AMOUNT
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: CHANGE_AMOUNT
        }]
      }

      // Get the transaction data
      const typedData = transaction.getTypedData(txBody, rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey])
      assert.equal(signatures.length, 1)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be CHANGE_AMOUNT
      balance = await childChain.getBalance(aliceAccount.address)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), CHANGE_AMOUNT.toString())
    })
  })

  describe('Transfer with 4 inputs and 4 outputs  (ci-enabled-fast)', async () => {
    const UTXO_AMOUNT = web3.utils.toWei('.0001', 'ether')
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)

      // Alice and Bob want 2 utxos each
      await faucet.fundChildchain(aliceAccount.address, UTXO_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, UTXO_AMOUNT)
      await faucet.fundChildchain(bobAccount.address, UTXO_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, bobAccount.address, UTXO_AMOUNT)

      await faucet.fundChildchain(aliceAccount.address, UTXO_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, UTXO_AMOUNT * 2)
      await faucet.fundChildchain(bobAccount.address, UTXO_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, bobAccount.address, UTXO_AMOUNT * 2)
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

    it('should send a transaction with 4 inputs and 4 outputs', async () => {
      // Check Alice's utxos on the child chain
      let aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 2)
      assert.hasAllKeys(aliceUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(aliceUtxos[0].amount.toString(), UTXO_AMOUNT)
      assert.equal(aliceUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(aliceUtxos[1].amount.toString(), UTXO_AMOUNT)
      assert.equal(aliceUtxos[1].currency, transaction.ETH_CURRENCY)

      // Check Bob's utxos on the child chain
      let bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
      assert.hasAllKeys(bobUtxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(bobUtxos[0].amount.toString(), UTXO_AMOUNT)
      assert.equal(bobUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(bobUtxos[1].amount.toString(), UTXO_AMOUNT)
      assert.equal(bobUtxos[1].currency, transaction.ETH_CURRENCY)

      // Construct the transaction body using all 4 deposit utxos
      const inputs = [aliceUtxos[0], aliceUtxos[1], bobUtxos[0], bobUtxos[1]]

      // Split the transaction into 4 different outputs:
      const ALICE_OUTPUT_0 = UTXO_AMOUNT * 0.2
      const ALICE_OUTPUT_1 = UTXO_AMOUNT * 1.3
      const BOB_OUTPUT_0 = UTXO_AMOUNT * 1
      const BOB_OUTPUT_1 = UTXO_AMOUNT * 1.5

      const outputs = [
        {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: ALICE_OUTPUT_0
        },
        {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: ALICE_OUTPUT_1
        },
        {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: BOB_OUTPUT_0
        },
        {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: BOB_OUTPUT_1
        }
      ]

      // Get the transaction data
      const typedData = transaction.getTypedData({ inputs, outputs }, rootChain.plasmaContractAddress)
      // Sign it with the correct private key for each input
      const signatures = childChain.signTransaction(typedData,
        [
          aliceAccount.privateKey,
          aliceAccount.privateKey,
          bobAccount.privateKey,
          bobAccount.privateKey
        ]
      )
      assert.equal(signatures.length, 4)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)

      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Alice's balance should be ALICE_OUTPUT_0 + ALICE_OUTPUT_1
      const expected = web3.utils.toBN(ALICE_OUTPUT_0).add(web3.utils.toBN(ALICE_OUTPUT_1))
      const balance = await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, expected)
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

  describe('ERC20 transfer', async () => {
    const ERC20_CURRENCY = config.testErc20Contract
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('.00000001', 'ether')
    const INTIIAL_ALICE_AMOUNT = 4
    const TRANSFER_AMOUNT = 3
    let aliceAccount
    let bobAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)

      // Give some ETH to Alice on the childchain to pay fees
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY)
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

    // Skipped because it will only work if the ERC20 token is also a fee currency
    it.skip('should transfer ERC20 tokens on the childchain', async () => {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])

      const erc20Utxo = utxos.find(utxo => utxo.currency === ERC20_CURRENCY)
      assert.equal(erc20Utxo.amount, INTIIAL_ALICE_AMOUNT)
      assert.equal(erc20Utxo.currency, ERC20_CURRENCY)

      const CHANGE_AMOUNT = erc20Utxo.amount - TRANSFER_AMOUNT
      const txBody = {
        inputs: [erc20Utxo],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: ERC20_CURRENCY,
          amount: Number(TRANSFER_AMOUNT)
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: ERC20_CURRENCY,
          amount: CHANGE_AMOUNT
        }]
      }

      // Get the transaction data
      const typedData = transaction.getTypedData(txBody, rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey])
      assert.equal(signatures.length, 1)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT, ERC20_CURRENCY)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount, TRANSFER_AMOUNT)

      // Alice's balance should be CHANGE_AMOUNT
      balance = await childChain.getBalance(aliceAccount.address)
      const erc20Balance = balance.filter(b => b.currency === ERC20_CURRENCY)
      assert.equal(erc20Balance[0].amount, CHANGE_AMOUNT)
    })
  })

  describe('Mixed currency transfer (ci-enabled)', async () => {
    const ERC20_CURRENCY = config.testErc20Contract
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('0.001', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 3
    const TRANSFER_AMOUNT_ETH = numberToBN(web3.utils.toWei('0.0004', 'ether'))
    const TRANSFER_AMOUNT_ERC20 = 2
    let aliceAccount
    let bobAccount

    before(async () => {
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

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should transfer ETH and ERC20 tokens on the childchain', async () => {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount, INTIIAL_ALICE_AMOUNT_ETH)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(utxos[1].amount, INTIIAL_ALICE_AMOUNT_ERC20)
      assert.equal(utxos[1].currency.toLowerCase(), ERC20_CURRENCY.toLowerCase())

      const CHANGE_AMOUNT_ETH = numberToBN(utxos[0].amount).sub(TRANSFER_AMOUNT_ETH)
      const CHANGE_AMOUNT_ERC20 = utxos[1].amount - TRANSFER_AMOUNT_ERC20
      const txBody = {
        inputs: [utxos[0], utxos[1]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: TRANSFER_AMOUNT_ETH
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: CHANGE_AMOUNT_ETH
        }, {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: ERC20_CURRENCY,
          amount: TRANSFER_AMOUNT_ERC20
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: ERC20_CURRENCY,
          amount: CHANGE_AMOUNT_ERC20
        }]
      }

      // Get the transaction data
      const typedData = transaction.getTypedData(txBody, rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey, aliceAccount.privateKey])
      assert.equal(signatures.length, 2)
      // Build the signed transaction
      const signedTx = childChain.buildSignedTransaction(typedData, signatures)
      // Submit the signed transaction to the childchain
      const result = await childChain.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's ETH balance should be TRANSFER_AMOUNT_ETH
      let balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT_ETH)
      // Bob's ERC20 balance should be TRANSFER_AMOUNT_ERC20
      balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT_ERC20, ERC20_CURRENCY)
      balance = balance.map(i => ({ ...i, currency: i.currency.toLowerCase() }))
      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: transaction.ETH_CURRENCY, amount: Number(TRANSFER_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY.toLowerCase(), amount: TRANSFER_AMOUNT_ERC20 })

      // Check Alice's balance
      balance = await childChain.getBalance(aliceAccount.address)
      balance = balance.map(i => ({ ...i, currency: i.currency.toLowerCase() }))

      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: transaction.ETH_CURRENCY, amount: Number(CHANGE_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY.toLowerCase(), amount: CHANGE_AMOUNT_ERC20 })
    })
  })

  describe('sendTransaction test (ci-enabled-fast)', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    // TRANSFER_AMOUNT is deliberately bigger than Number.MAX_SAFE_INTEGER to cause rounding errors if not properly handled
    const TRANSFER_AMOUNT = '20000000000000123'
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

    it('should transfer funds on the childchain', async () => {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.hasAllKeys(utxos[0], ['utxo_pos', 'txindex', 'owner', 'oindex', 'currency', 'blknum', 'amount'])
      assert.equal(utxos[0].amount.toString(), INTIIAL_ALICE_AMOUNT)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)

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
      const balance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)
    })
  })
})
