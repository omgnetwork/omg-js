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
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const faucetName = path.basename(__filename)

describe('simpleErc20TransferTest.js', function () {
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

  describe('ERC20 transfer', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('.0001', 'ether')
    const INTIIAL_ALICE_AMOUNT = 4
    const TRANSFER_AMOUNT = 3

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)

      // Give some ETH to Alice on the childchain to pay fees
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, transaction.ETH_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT, ERC20_CURRENCY)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should transfer ERC20 tokens on the childchain', async function () {
      // Check utxos on the child chain
      const utxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)

      const erc20Utxo = utxos.find(utxo => utxo.currency === ERC20_CURRENCY)
      const ethUtxo = utxos.find(utxo => utxo.currency === transaction.ETH_CURRENCY)
      assert.equal(erc20Utxo.amount, INTIIAL_ALICE_AMOUNT)
      assert.equal(erc20Utxo.currency, ERC20_CURRENCY)

      const CHANGE_AMOUNT = erc20Utxo.amount - TRANSFER_AMOUNT
      const CHANGE_AMOUNT_FEE = ethUtxo.amount - feeEth
      const txBody = {
        inputs: [ethUtxo, erc20Utxo],
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
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: transaction.ETH_CURRENCY,
          amount: CHANGE_AMOUNT_FEE
        }]
      }

      // Get the transaction data
      const typedData = transaction.getTypedData(txBody, rootChain.plasmaContractAddress)
      // Sign it
      const signatures = childChain.signTransaction(typedData, [aliceAccount.privateKey, aliceAccount.privateKey])
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
})
