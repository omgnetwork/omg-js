/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import Web3 from 'web3';
import BN from 'bn.js';
import web3Utils from 'web3-utils';
import path from 'path';
import { assert, should, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import OmgJS from '../..';

import faucet from '../helpers/faucet';
import * as rcHelper from '../helpers/rootChainHelper';
import * as ccHelper from '../helpers/childChainHelper';
import config from '../test-config';

should();
use(chaiAsPromised);

const faucetName = path.basename(__filename);

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('createTransactionTest.js', function () {
  let FEE_ETH_AMOUNT

  before(async function () {
    await faucet.init({ faucetName })
    const fees = (await omgjs.getFees())['1']
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH)
    FEE_ETH_AMOUNT = new BN(amount.toString())
  })

  describe('create a single currency transaction', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether')
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether')

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create and submit a single currency transaction', async function () {
      const createdTx = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: Number(TRANSFER_AMOUNT)
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      const typedData = omgjs.getTypedData(createdTx.transactions[0])
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [aliceAccount.privateKey] })
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's balance should be TRANSFER_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be INTIIAL_ALICE_AMOUNT - TRANSFER_AMOUNT - FEE_AMOUNT
      const aliceBalance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 1)
      const expected = new BN(INTIIAL_ALICE_AMOUNT.toString()).sub(new BN(TRANSFER_AMOUNT.toString())).sub(FEE_ETH_AMOUNT)
      assert.equal(aliceBalance[0].amount.toString(), expected.toString())
    })
  })

  describe('create a single currency transaction with no receiver', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether')
    const TRANSFER_AMOUNT = web3Utils.toWei('.0000001', 'ether')
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create a single currency transaction', async function () {
      const createdTx = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          currency: OmgJS.currency.ETH,
          amount: Number(TRANSFER_AMOUNT),
          owner: bobAccount.address
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)
    })
  })

  describe('create a mixed currency transaction', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const INTIIAL_ALICE_AMOUNT_ETH = web3Utils.toWei('0.001', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 3
    const TRANSFER_AMOUNT_ETH = new BN(web3Utils.toWei('0.0004', 'ether'))
    const TRANSFER_AMOUNT_ERC20 = 2

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 tokens to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create and submit a mixed currency transaction', async function () {
      const createdTx = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: Number(TRANSFER_AMOUNT_ETH)
        }, {
          owner: bobAccount.address,
          currency: ERC20_CURRENCY,
          amount: Number(TRANSFER_AMOUNT_ERC20)
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx.result, 'complete')
      assert.equal(createdTx.transactions.length, 1)

      const typedData = omgjs.getTypedData(createdTx.transactions[0])
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [aliceAccount.privateKey, aliceAccount.privateKey] })
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's ETH balance should be TRANSFER_AMOUNT_ETH
      let balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT_ETH.toString())
      // Bob's ERC20 balance should be TRANSFER_AMOUNT_ERC20
      balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT_ERC20, ERC20_CURRENCY)
      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: OmgJS.currency.ETH, amount: Number(TRANSFER_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY, amount: TRANSFER_AMOUNT_ERC20 })

      // Check Alice's balance
      balance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(balance.length, 2)
      const expectedEth = new BN(INTIIAL_ALICE_AMOUNT_ETH).sub(new BN(TRANSFER_AMOUNT_ETH)).sub(FEE_ETH_AMOUNT)
      assert.deepInclude(balance, { currency: OmgJS.currency.ETH, amount: Number(expectedEth.toString()) })
      const expectedErc20 = new BN(INTIIAL_ALICE_AMOUNT_ERC20).sub(new BN(TRANSFER_AMOUNT_ERC20))
      assert.deepInclude(balance, { currency: ERC20_CURRENCY, amount: Number(expectedErc20.toString()) })
    })
  })

  describe('create an incomplete transaction', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0000000001', 'ether')
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, Number(INTIIAL_ALICE_AMOUNT) / 2, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, Number(INTIIAL_ALICE_AMOUNT) / 2)
      await faucet.fundChildchain(aliceAccount.address, Number(INTIIAL_ALICE_AMOUNT) / 2, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      // Split alice's utxos so that she won't be able to send to Bob in one transaction
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      await ccHelper.splitUtxo(aliceAccount, utxos[0], 4)
      await ccHelper.splitUtxo(aliceAccount, utxos[1], 4)
      // Wait for the split txs to finalise
      await ccHelper.waitNumUtxos(aliceAccount.address, 8)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should create an incomplete transaction', async function () {
      const toSendAmount = new BN(INTIIAL_ALICE_AMOUNT).sub(new BN(FEE_ETH_AMOUNT).mul(new BN(3)))
      const createdTx = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: toSendAmount
          // split 2 times so we need to deduct the fee
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx.result, 'intermediate')
      assert.equal(createdTx.transactions.length, 2)

      // Send the intermediate transactions
      await Promise.all(createdTx.transactions.map(tx => {
        const typedData = omgjs.getTypedData(tx)
        const privateKeys = new Array(tx.inputs.length).fill(aliceAccount.privateKey)
        const signatures = omgjs.signTransaction({ typedData, privateKeys })
        const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
        return omgjs.submitTransaction(signedTx)
      }))

      // Wait for the intermediate transactions.
      await ccHelper.waitNumUtxos(aliceAccount.address, 2)

      // Try createTransaction again
      const createdTx2 = await omgjs.createTransaction({
        owner: aliceAccount.address,
        payments: [{
          owner: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: toSendAmount
          // split 2 times so we need to deduct the fee
        }],
        feeCurrency: OmgJS.currency.ETH
      })
      assert.equal(createdTx2.result, 'complete')
      assert.equal(createdTx2.transactions.length, 1)

      // Get the transaction data
      const typedData = omgjs.getTypedData(createdTx2.transactions[0])
      const privateKeys = new Array(createdTx2.transactions[0].inputs.length).fill(aliceAccount.privateKey)
      const signatures = omgjs.signTransaction({ typedData, privateKeys })
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's balance should be INTIIAL_ALICE_AMOUNT
      const bobBalance = await ccHelper.waitForBalanceEq(bobAccount.address, toSendAmount.toString())
      assert.equal(bobBalance.length, 1)
      assert.equal(bobBalance[0].amount.toString(), toSendAmount)

      // Alice's balance should be 0
      const aliceBalance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(aliceBalance.length, 0)
    })
  })

  describe('create a transaction to split utxos', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.0001', 'ether')
    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should split a utxo into 4', async function () {
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      const utxo = utxos[0]
      const div = Math.floor(utxo.amount / 4)
      const payments = new Array(4).fill('x').map((x, i) => ({
        owner: aliceAccount.address,
        currency: OmgJS.currency.ETH,
        amount: i === 0 ? div - FEE_ETH_AMOUNT : div
      }))

      const fee = {
        currency: OmgJS.currency.ETH,
        amount: FEE_ETH_AMOUNT
      }

      const txBody = omgjs.createTransactionBody({
        fromAddress: aliceAccount.address,
        fromUtxos: utxos,
        payments,
        fee
      })

      const typedData = omgjs.getTypedData(txBody)
      const privateKeys = new Array(txBody.inputs.length).fill(aliceAccount.privateKey)
      const signatures = omgjs.signTransaction({ typedData, privateKeys })
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Wait for the split tx to finalise, Alice should now have 4 utxos
      await ccHelper.waitNumUtxos(aliceAccount.address, 4)
    })
  })
})
