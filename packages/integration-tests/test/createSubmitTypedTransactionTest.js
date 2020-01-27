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

describe('createSubmitTypedTransactionTest.js (ci-enabled)', function () {
  const web3 = new Web3(config.geth_url)
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  let rootChain

  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('create a single currency transaction with submitTyped', function () {
    let INTIIAL_ALICE_AMOUNT
    let TRANSFER_AMOUNT
    const FEE_AMOUNT = 10
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

    it('should create and submit a single currency transaction using submitTyped', async function () {
      const payments = [{
        owner: bobAccount.address,
        currency: transaction.ETH_CURRENCY,
        amount: Number(TRANSFER_AMOUNT)
      }]

      const fee = {
        currency: transaction.ETH_CURRENCY,
        amount: FEE_AMOUNT
      }

      const createdTx = await childChain.createTransaction({
        owner: aliceAccount.address,
        payments,
        fee
      })
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      const txTypedData = childChain.signTypedData(createdTx.transactions[0], [aliceAccount.privateKey])
      const result = await childChain.submitTyped(txTypedData)
      console.log(`Submitted transaction: ${JSON.stringify(result)}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be INTIIAL_ALICE_AMOUNT - TRANSFER_AMOUNT - FEE_AMOUNT
      const aliceBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 1)
      const expected = numberToBN(INTIIAL_ALICE_AMOUNT).sub(numberToBN(TRANSFER_AMOUNT)).subn(FEE_AMOUNT)
      assert.equal(aliceBalance[0].amount.toString(), expected.toString())
    })
  })
})
