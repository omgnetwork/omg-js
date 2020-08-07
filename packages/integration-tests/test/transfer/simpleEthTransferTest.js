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

describe('simpleEthTransferTest.js', function () {
  const web3 = new Web3(config.eth_node)
  let childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
  let feeEth

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
    const fees = (await childChain.getFees())['1']
    const { amount } = fees.find(f => f.currency === transaction.ETH_CURRENCY)
    feeEth = amount
  })

  describe('hitting watcher-info service only', function () {
    before(async function () {
      childChain = new ChildChain({
        watcherUrl: config.watcher_url,
        watcherProxyUrl: config.watcher_proxy_url,
        plasmaContractAddress: config.plasmaframework_contract_address
      })
    })

    simpleEthTransferScenario()
  })

  describe('hitting both watcher-security and watcher-info service', function () {
    before(async function () {
      childChain = new ChildChain({
        watcherUrl: config.watcher_url,
        watcherSecurityUrl: config.watcher_security_url,
        watcherProxyUrl: config.watcher_proxy_url,
        plasmaContractAddress: config.plasmaframework_contract_address
      })
    })

    simpleEthTransferScenario()
  })

  function simpleEthTransferScenario () {
    describe('Simple ETH', function () {
      const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
      let TRANSFER_AMOUNT
      let aliceAccount
      let bobAccount

      beforeEach(async function () {
        aliceAccount = rcHelper.createAccount(web3)
        bobAccount = rcHelper.createAccount(web3)
        // TRANSFER_AMOUNT is deliberately bigger than Number.MAX_SAFE_INTEGER to cause rounding errors if not properly handled
        TRANSFER_AMOUNT = numberToBN('20000000000000123')
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

      it('should transfer ETH on the childchain', async function () {
        // Check utxos on the child chain
        const utxos = await childChain.getUtxos(aliceAccount.address)
        assert.equal(utxos.length, 1)
        assert.equal(utxos[0].amount.toString(), INTIIAL_ALICE_AMOUNT)
        assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)

        const CHANGE_AMOUNT = numberToBN(utxos[0].amount).sub(numberToBN(TRANSFER_AMOUNT)).sub(numberToBN(feeEth))
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
  }
})
