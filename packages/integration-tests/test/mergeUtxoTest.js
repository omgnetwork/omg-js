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
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const faucetName = path.basename(__filename)

describe('mergeUtxoTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const childChain = new ChildChain({
    watcherUrl: config.watcher_url,
    watcherProxyUrl: config.watcher_proxy_url
  })
  const rootChain = new RootChain({
    web3,
    plasmaContractAddress: config.plasmaframework_contract_address
  })

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
  })

  describe('deposit ETH', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TEST_AMOUNT = web3.utils.toWei('.0001', 'ether')

    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should merge utxos to a single utxo', async function () {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(initialBalance.length, 0)

      // Deposit ETH into the Plasma contract
      await rootChain.deposit({
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      // Wait for transaction to be mined and reflected in the account's balance
      await ccHelper.waitForBalanceEq(
        childChain,
        aliceAccount.address,
        TEST_AMOUNT
      )

      await rootChain.deposit({
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      await ccHelper.waitForBalanceEq(
        childChain,
        aliceAccount.address,
        TEST_AMOUNT * 2
      )

      // THe account should have one utxo on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      await childChain.mergeUtxos({
        utxos,
        privateKey: aliceAccount.privateKey,
        verifyingContract: config.plasmaframework_contract_address
      })
      await ccHelper.waitNumUtxos(childChain, aliceAccount.address, 1)
      const utxosMerged = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxosMerged.length, 1)
      assert.equal(utxosMerged[0].amount.toString(), (TEST_AMOUNT * 2).toString())
    })
  })
})
