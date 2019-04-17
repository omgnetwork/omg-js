/*
Copyright 2018 OmiseGO Pte Ltd

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
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

const INFLIGHT_EXIT_BOND = 31415926535
const PIGGYBACK_BOND = 31415926535

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.

describe('In-flight Exit Challenge tests', async () => {
  before(async () => {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction challenge exit (ci-enabled)', async () => {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
    let aliceAccount
    let bobAccount
    let carolAccount

    before(async () => {
      // Create Alice and Bob's accounts
      aliceAccount = await rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = await rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      carolAccount = await rcHelper.createAccount(web3)
      console.log(`Created Carol account ${JSON.stringify(carolAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(web3, carolAccount.address, INTIIAL_BOB_RC_AMOUNT)

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, carolAccount.address, INTIIAL_BOB_RC_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
    })

    after(async () => {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
        await faucet.returnFunds(web3, carolAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should challenge an in-flight exit by providing a competitor', async () => {
      // Alice creates a transaction to send funds to Bob
      const bobTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey
      )

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await childChain.inFlightExitGetData(bobTx)
      assert.hasAllKeys(exitData, ['in_flight_tx', 'in_flight_tx_sigs', 'input_txs', 'input_txs_inclusion_proofs'])

      // Starts the in-flight exit
      let receipt = await rootChain.startInFlightExit(
        exitData.in_flight_tx,
        exitData.input_txs,
        exitData.input_txs_inclusion_proofs,
        exitData.in_flight_tx_sigs,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      let bobSpentOnGas = await rcHelper.spentOnGas(web3, receipt)

      // Decode the transaction to get the index of Bob's output
      const decodedTx = transaction.decode(bobTx)
      const outputIndex = decodedTx.outputs.findIndex(e => e.owner === bobAccount.address)

      // Bob piggybacks his output on the in-flight exit
      receipt = await rootChain.piggybackInFlightExit(
        exitData.in_flight_tx,
        outputIndex + 4,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )

      console.log(`Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction _does_ get put into a block.
      const carolTx = await ccHelper.sendAndWait(
        childChain,
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      )

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = transaction.decode(carolTx.txbytes)
      const cInput = carolTxDecoded.inputs[0]
      const invalidExit = await ccHelper.waitForEvent(
        childChain,
        'in_flight_exits',
        e => {
          const decoded = transaction.decode(e.txbytes)
          return decoded.inputs.find(input =>
            input.blknum === cInput.blknum &&
            input.txindex === cInput.txindex &&
            input.oindex === cInput.oindex
          )
        }
      )

      // Carol gets the competitor of Bob's exit
      const competitor = await childChain.inFlightExitGetCompetitor(invalidExit.txbytes)
      console.log(`Got competitor`)

      // Challenge the IFE as non canonical
      await rootChain.challengeInFlightExitNotCanonical(
        competitor.in_flight_txbytes,
        competitor.in_flight_input_index,
        competitor.competing_txbytes,
        competitor.competing_input_index,
        competitor.competing_tx_pos,
        competitor.competing_proof,
        competitor.competing_sig,
        {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      )

      // Wait for challenge period
      const utxoPos = transaction.encodeUtxoPos(cInput)
      const toWait = await rcHelper.getTimeToExit(rootChain.plasmaContract, utxoPos)
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      // Call processExits again.
      receipt = await rootChain.processExits(
        transaction.ETH_CURRENCY,
        0,
        1,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address,
          gas: 200000
        }
      )
      console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Bob's ETH balance
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Expect Bob's balance to be INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND - PIGGYBACK_BOND - gas spent
      const expected = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3.utils.toBN(INFLIGHT_EXIT_BOND))
        .sub(web3.utils.toBN(PIGGYBACK_BOND))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })
})
