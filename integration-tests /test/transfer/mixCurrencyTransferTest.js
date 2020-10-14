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

describe('mixCurrencyTransferTest.js', function () {
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

  describe('Mixed currency transfer', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('0.001', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 2
    const TRANSFER_AMOUNT_ETH = numberToBN(web3.utils.toWei('0.0004', 'ether'))
    const TRANSFER_AMOUNT_ERC20 = 1
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 tokens to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should transfer ETH and ERC20 tokens on the childchain', async function () {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      assert.equal(utxos[0].amount, INTIIAL_ALICE_AMOUNT_ETH)
      assert.equal(utxos[0].currency, transaction.ETH_CURRENCY)
      assert.equal(utxos[1].amount, INTIIAL_ALICE_AMOUNT_ERC20)
      assert.equal(utxos[1].currency.toLowerCase(), ERC20_CURRENCY.toLowerCase())

      const CHANGE_AMOUNT_ETH = numberToBN(utxos[0].amount).sub(TRANSFER_AMOUNT_ETH).sub(numberToBN(feeEth))
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
})
