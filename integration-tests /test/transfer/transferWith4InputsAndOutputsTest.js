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

const config = require('../../test-config')
const rcHelper = require('../../helpers/rootChainHelper')
const ccHelper = require('../../helpers/childChainHelper')
const faucet = require('../../helpers/faucet')
const Web3 = require('web3')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const faucetName = path.basename(__filename)

describe('transferTest.js', function () {
  const web3 = new Web3(config.eth_node)
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
  let feeEth

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
    const fees = (await childChain.getFees())['1']
    const { amount } = fees.find(f => f.currency === transaction.ETH_CURRENCY)
    feeEth = amount
  })

  describe('Transfer with 4 inputs and 4 outputs', function () {
    const UTXO_AMOUNT = web3.utils.toWei('.0001', 'ether')
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)

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

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should send a transaction with 4 inputs and 4 outputs', async function () {
      // Check Alice's utxos on the child chain
      let aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 2)
      assert.equal(aliceUtxos[0].amount.toString(), UTXO_AMOUNT)
      assert.equal(aliceUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(aliceUtxos[1].amount.toString(), UTXO_AMOUNT)
      assert.equal(aliceUtxos[1].currency, transaction.ETH_CURRENCY)

      // Check Bob's utxos on the child chain
      let bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
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
      const BOB_OUTPUT_1 = numberToBN(UTXO_AMOUNT).mul(numberToBN(3)).div(numberToBN(2)).sub(numberToBN(feeEth))
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
      assert.equal(aliceUtxos[0].amount.toString(), ALICE_OUTPUT_0)
      assert.equal(aliceUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(aliceUtxos[1].amount.toString(), ALICE_OUTPUT_1)
      assert.equal(aliceUtxos[1].currency, transaction.ETH_CURRENCY)

      // Check Bob's utxos on the child chain again
      bobUtxos = await childChain.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
      assert.equal(bobUtxos[0].amount.toString(), BOB_OUTPUT_0)
      assert.equal(bobUtxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(bobUtxos[1].amount.toString(), BOB_OUTPUT_1)
      assert.equal(bobUtxos[1].currency, transaction.ETH_CURRENCY)
    })
  })
})
