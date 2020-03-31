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
const faucet = require('../helpers/faucet')
const Web3 = require('web3')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const numberToBN = require('number-to-bn')
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const faucetName = path.basename(__filename)

describe('createSubmitTypedTransactionTest.js', function () {
  const web3 = new Web3(config.eth_node)
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
  let FEE_ETH_AMOUNT
  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
    const fees = (await childChain.getFees())['1']
    const { amount } = fees.find(f => f.currency === transaction.ETH_CURRENCY)
    FEE_ETH_AMOUNT = numberToBN(amount)
  })

  describe('create a single currency transaction with submitTyped', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.000001', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('.0000001', 'ether')

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
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
        currency: transaction.ETH_CURRENCY
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
      const expected = numberToBN(INTIIAL_ALICE_AMOUNT).sub(numberToBN(TRANSFER_AMOUNT)).sub(FEE_ETH_AMOUNT)
      assert.equal(aliceBalance[0].amount.toString(), expected.toString())
    })
  })
})
