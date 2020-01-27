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
const chai = require('chai')
const numberToBN = require('number-to-bn')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
})
// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.
let rootChain

describe('Challenge in-flight exit output spent tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction challenge with a invalid output piggybacking', function () {
    let INTIIAL_ALICE_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let INTIIAL_CAROL_RC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount
    let carolAccount
    let fundAliceTx

    before(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('1', 'ether')
      INTIIAL_CAROL_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')
      // Create Alice and Bob's accounts
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
      carolAccount = rcHelper.createAccount(web3)
      console.log(`Created Carol account ${JSON.stringify(carolAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx))
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(
        web3,
        carolAccount.address,
        INTIIAL_CAROL_RC_AMOUNT
      )

      await faucet.fundRootchainEth(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          carolAccount.address,
          INTIIAL_CAROL_RC_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          bobAccount.address,
          INTIIAL_BOB_RC_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        )
      ])
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
        await faucet.returnFunds(web3, carolAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    // failingtest
    it('should challenge output from a canonical invalid output piggyback', async function () {
      // Alice creates a transaction to send funds to Bob
      const bobSpentOnGas = numberToBN(0)
      const carolSpentOnGas = numberToBN(0)
      const bobTxNotIncluded = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )

      // Bob doesn't see the transaction get put into a block. He assumes that the operator
      // is witholding, so he attempts to exit his spent utxo as an in-flight exit

      // Get the exit data
      const exitData = await childChain.inFlightExitGetData(bobTxNotIncluded)

      // Starts the in-flight exit
      const ifeReceipt = await rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: exitData.in_flight_tx_sigs,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      }

      )
      console.log(
        `Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`
      )
      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, ifeReceipt))

      // bob piggybacks his output on the in-flight exit
      let receipt = await rootChain.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: 0,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))
      console.log(
        `Bob called RootChain.piggybackInFlightExitOnOutput() : txhash = ${receipt.transactionHash}`
      )

      // Meanwhile, the tx get included in the block, makes the IFE piggyback invalid
      await ccHelper.sendAndWait(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT,
        rootChain.plasmaContractAddress
      )

      // utxo update from watcher have delay, balance updated first we need to wait a bit
      await ccHelper.waitNumUtxos(childChain, bobAccount.address, 1)

      // bob use his IFE piggyback output so this become the competitor tx
      await ccHelper.sendAndWait(
        childChain,
        bobAccount.address,
        aliceAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        bobAccount.privateKey,
        INTIIAL_ALICE_AMOUNT,
        rootChain.plasmaContractAddress
      )

      // the second tx is sent, but it takes awhile before watcher can get the Challenge data...
      await rcHelper.sleep(10000)

      const challengeData = await childChain.inFlightExitGetOutputChallengeData(exitData.in_flight_tx, 0)

      receipt = await rootChain.challengeInFlightExitOutputSpent({
        inFlightTx: challengeData.in_flight_txbytes,
        inFlightTxInclusionProof: challengeData.in_flight_proof,
        inFlightTxOutputPos: challengeData.in_flight_output_pos,
        challengingTx: challengeData.spending_txbytes,
        challengingTxInputIndex: challengeData.spending_input_index,
        challengingTxWitness: challengeData.spending_sig,
        txOptions: {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      })
      carolSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization}ms`)
      await rcHelper.sleep(msUntilFinalization)

      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 10,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(
        `Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`
      )
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      await rcHelper.awaitTx(web3, receipt.transactionHash)
      const { bonds } = await rootChain.getPaymentExitGame()
      // Get carol's ETH balance
      const carolEthBalance = await web3.eth.getBalance(carolAccount.address)
      // carol got Bob's exit bond, and piggyback of bob's output so expect her balance to be
      // INTIIAL_CAROL_AMOUNT + INFLIGHT_EXIT_BOND  + INFLIGHT_PIGGYBACK_BOND - gas spent
      const carolExpected = web3.utils
        .toBN(INTIIAL_CAROL_RC_AMOUNT)
        .add(web3.utils.toBN(bonds.piggyback))
        .sub(carolSpentOnGas)
      assert.equal(carolEthBalance.toString(), carolExpected.toString())

      // Get carol's ETH balance
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Bob doesn't lose his exit bond hence he paid and get back, but lose the piggyback bond and gas
      // INTIIAL_BOB_AMOUNT - INFLIGHT_EXIT_BOND + INFLIGHT_EXIT_BOND - INFLIGHT_PIGGYBACK_BOND - gas spent
      const bobExpected = web3.utils
        .toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(web3.utils.toBN(bonds.piggyback))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), bobExpected.toString())
    })
  })
})
