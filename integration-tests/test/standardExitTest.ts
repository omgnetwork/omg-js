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
import erc20abi from 'human-standard-token-abi';
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

const faucetName = path.basename(__filename)

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('standardExitTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('Deposit transaction exit', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.3', 'ether')
    const DEPOSIT_AMOUNT = web3Utils.toWei('.0001', 'ether')

    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
      await rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully exit a deposit', async function () {
      // Alice deposits ETH into the Plasma contract
      let receipt = await omgjs.deposit({
        amount: DEPOSIT_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })
      await ccHelper.waitForBalanceEq(aliceAccount.address, DEPOSIT_AMOUNT)
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)

      // Keep track of how much Alice spends on gas
      const aliceSpentOnGas = await rcHelper.spentOnGas(receipt)
      console.log(`aliceSpentOnGas = ${aliceSpentOnGas}`)

      // Alice wants to exit without having transacted on the childchain

      // Get Alice's deposit utxo
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 1)
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

      // Get the exit data
      const utxoToExit = aliceUtxos[0]
      const exitData = await omgjs.getExitData(utxoToExit)
      assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const standardExitReceipt = await omgjs.startStandardExit({
        utxoPos: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(`Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`)
      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(standardExitReceipt))

      // Call processExits before the challenge period is over
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        aliceSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Alice's ETH balance
      let aliceEthBalance = await omgjs.getRootchainETHBalance(aliceAccount.address)
      // Expect Alice's balance to be less than INTIIAL_ALICE_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(aliceEthBalance), Number(INTIIAL_ALICE_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        aliceSpentOnGas.iadd(await rcHelper.spentOnGas(receipt))
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      // Get Alice's ETH balance
      aliceEthBalance = await omgjs.getRootchainETHBalance(aliceAccount.address)
      // Expect Alice's balance to be INTIIAL_ALICE_AMOUNT - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_ALICE_AMOUNT)
        .sub(aliceSpentOnGas)
      assert.equal(aliceEthBalance.toString(), expected.toString())
    })
  })

  describe('childchain transaction exit', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.001', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.1', 'ether')
    const TRANSFER_AMOUNT = web3Utils.toWei('0.0002', 'ether')
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          OmgJS.currency.ETH
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          bobAccount.address,
          INTIIAL_BOB_RC_AMOUNT
        )
      ])
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully exit a ChildChain transaction', async function () {
      // Track total gas used
      const bobSpentOnGas = new BN(0)

      // Send TRANSFER_AMOUNT from Alice to Bob
      await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      )

      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // Bob wants to exit
      const bobUtxos = await omgjs.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 1)
      assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

      // Get the exit data
      const utxoToExit = bobUtxos[0]
      const exitData = await omgjs.getExitData(utxoToExit)
      assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const startStandardExitReceipt = await omgjs.startStandardExit({
        utxoPos: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(`Bob called RootChain.startExit(): txhash = ${startStandardExitReceipt.transactionHash}`)

      bobSpentOnGas.iadd(await rcHelper.spentOnGas(startStandardExitReceipt))

      // Call processExits before the challenge period is over
      const processExitReceiptBefore = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (processExitReceiptBefore) {
        console.log(`Bob called RootChain.processExits() before challenge period: txhash = ${processExitReceiptBefore.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(processExitReceiptBefore))
        await rcHelper.awaitTx(processExitReceiptBefore.transactionHash)
      }

      // Get Bob's ETH balance
      let bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be less than INTIIAL_BOB_AMOUNT because the exit has not been processed yet
      assert.isBelow(Number(bobEthBalance), Number(INTIIAL_BOB_RC_AMOUNT))

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: startStandardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      const processExitReceiptAfter = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (processExitReceiptAfter) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${processExitReceiptAfter.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(processExitReceiptAfter))
        await rcHelper.awaitTx(processExitReceiptAfter.transactionHash)
      }

      // Get Bob's ETH balance
      bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3Utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3Utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })

  describe('ERC20 exit', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const testErc20Contract = new omgjs.web3Instance.eth.Contract(erc20abi, config.erc20_contract_address)
    const INTIIAL_ALICE_AMOUNT_ETH = web3Utils.toWei('.1', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 2
    let aliceAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      await Promise.all([
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ERC20,
          ERC20_CURRENCY
        ),
        faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      ])

      await Promise.all([
        ccHelper.waitForBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ERC20,
          ERC20_CURRENCY
        ),
        rcHelper.waitForEthBalanceEq(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT_ETH
        )
      ])
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should exit ERC20 tokens', async function () {
      // Check utxos on the child chain
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.equal(utxos[0].amount, INTIIAL_ALICE_AMOUNT_ERC20)
      assert.equal(
        utxos[0].currency.toLowerCase(),
        ERC20_CURRENCY.toLowerCase()
      )

      // Get the exit data
      const utxoToExit = utxos[0]
      const exitData = await omgjs.getExitData(utxoToExit)
      assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const standardExitReceipt = await omgjs.startStandardExit({
        utxoPos: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(
        `Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`
      )

      // Call processExits before the challenge period is over
      let receipt = await omgjs.processExits({
        currency: config.erc20_contract_address,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() before challenge period: txhash = ${receipt.transactionHash}`)
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      let balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, 0)

      // Wait for challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: utxoToExit.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      // Call processExits again.
      receipt = await omgjs.processExits({
        currency: config.erc20_contract_address,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      if (receipt) {
        console.log(`Alice called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
        await rcHelper.awaitTx(receipt.transactionHash)
      }

      balance = await testErc20Contract.methods
        .balanceOf(aliceAccount.address)
        .call({ from: aliceAccount.address })
      assert.equal(balance, INTIIAL_ALICE_AMOUNT_ERC20)
    })
  })
})
