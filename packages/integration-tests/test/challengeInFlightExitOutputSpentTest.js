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

describe('challengeInFlightExitOutputSpentTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
  })

  describe('in-flight transaction challenge with a invalid output piggybacking', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
    const INTIIAL_CAROL_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')

    let aliceAccount
    let bobAccount
    let carolAccount
    let fundAliceTx

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)
      carolAccount = rcHelper.createAccount(web3)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => (fundAliceTx = tx))
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(carolAccount.address, INTIIAL_CAROL_RC_AMOUNT)
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)

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

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
        await faucet.returnFunds(carolAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should challenge output from a canonical invalid output piggyback', async function () {
      const bobSpentOnGas = numberToBN(0)
      const carolSpentOnGas = numberToBN(0)

      // Alice sends to Bob
      const tx1 = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )
      const tx1Receipt = await childChain.submitTransaction(tx1)
      await ccHelper.waitNumUtxos(childChain, bobAccount.address, 1)
      console.log('Alice sends tx to Bob: ', tx1Receipt.txhash)

      // Bob IFE's tx1 and piggybacks the output
      const exitData = await childChain.inFlightExitGetData(tx1)
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
      })
      console.log('Bob starts an IFE: ', ifeReceipt.transactionHash)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, ifeReceipt))

      const piggyReceipt = await rootChain.piggybackInFlightExitOnOutput({
        inFlightTx: exitData.in_flight_tx,
        outputIndex: 0,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log('Bob piggybacks his output: ', piggyReceipt.transactionHash)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, piggyReceipt))

      // Bob spends his utxo to carol
      const tx2 = await ccHelper.createTx(
        childChain,
        bobAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        bobAccount.privateKey,
        rootChain.plasmaContractAddress
      )
      const tx2Receipt = await childChain.submitTransaction(tx2)
      await ccHelper.waitNumUtxos(childChain, carolAccount.address, 1)
      console.log('Bob spends his UTXO on Carol: ', tx2Receipt.txhash)

      // Bobs piggybacked output was spent, and needs to be challenged
      // tx2 is sent, but it takes awhile before watcher can get the Challenge data...
      await rcHelper.sleep(20000)
      const challengeData = await childChain.inFlightExitGetOutputChallengeData(exitData.in_flight_tx, 0)
      const challengeReceipt = await rootChain.challengeInFlightExitOutputSpent({
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
      console.log('Carol challenges IFE output spent: ', challengeReceipt.transactionHash)
      carolSpentOnGas.iadd(await rcHelper.spentOnGas(web3, challengeReceipt))

      // Wait for challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: fundAliceTx.result.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
      await rcHelper.sleep(msUntilFinalization)

      const processReceipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 10,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      if (processReceipt) {
        console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${processReceipt.transactionHash}`)
        bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, processReceipt))
        await rcHelper.awaitTx(web3, processReceipt.transactionHash)
      }

      const { bonds } = await rootChain.getPaymentExitGame()
      // Bob's piggyback was challenged, so he shouldnt have gotten his output out
      // Bob RC Balance - Bob gas - Bobs piggyback bond
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      const bobExpected = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(bobSpentOnGas)
        .sub(web3.utils.toBN(bonds.piggyback))
      assert.equal(bobEthBalance.toString(), bobExpected.toString())

      // Carol challenged the piggyback so she should get the piggy back bond
      // Carol RC Balance - Carol gas + Bobs piggyback bond
      const carolsEthBalance = await web3.eth.getBalance(carolAccount.address)
      const carolExpected = web3.utils.toBN(INTIIAL_CAROL_RC_AMOUNT)
        .sub(carolSpentOnGas)
        .add(web3.utils.toBN(bonds.piggyback))
      assert.equal(carolsEthBalance.toString(), carolExpected.toString())
    })
  })
})
