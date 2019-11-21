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
const numberToBN = require('number-to-bn')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
let rootChain

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.
describe('In-flight Exit Challenge Response tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('in-flight transaction challenge response', function () {
    let INTIIAL_ALICE_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount
    let carolAccount
    let fundAliceTx
    before(async function () {
      INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.5', 'ether')
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
        faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, transaction.ETH_CURRENCY),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ]).then(([tx]) => {
        fundAliceTx = tx
      })
      // Give some ETH to Carol on the root chain
      await faucet.fundRootchainEth(web3, carolAccount.address, INTIIAL_BOB_RC_AMOUNT)

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, carolAccount.address, INTIIAL_BOB_RC_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
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

    it('should respond to an invalid IFE challenge', async function () {
      // Alice creates a transaction to send funds to Bob
      const bobSpentOnGas = numberToBN(0)
      const bobTx = await ccHelper.createTx(
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
      const exitData = await childChain.inFlightExitGetData(bobTx)
      const decodedTx = transaction.decodeTxBytes(bobTx)

      assert.hasAllKeys(exitData, ['in_flight_tx', 'in_flight_tx_sigs', 'input_txs', 'input_txs_inclusion_proofs', 'input_utxos_pos'])

      // Starts the in-flight exit
      let receipt = await rootChain.startInFlightExit(
        exitData.in_flight_tx,
        exitData.input_txs,
        exitData.input_utxos_pos,
        ['0x'],
        exitData.input_txs_inclusion_proofs,
        decodedTx.sigs,
        exitData.in_flight_tx_sigs,
        ['0x'],
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.startInFlightExit(): txhash = ${receipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))
      const outputIndex = decodedTx.outputs.findIndex(e => e.outputGuard === bobAccount.address)

      // Bob piggybacks his output on the in-flight exit
      receipt = await rootChain.piggybackInFlightExitOnOutput(
        exitData.in_flight_tx,
        outputIndex,
        '0x',
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )

      console.log(`Bob called RootChain.piggybackInFlightExit() : txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Meanwhile, Alice also sends funds to Carol (double spend). This transaction doesn't get put into a block either.
      const carolTx = await ccHelper.createTx(
        childChain,
        aliceAccount.address,
        carolAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        rootChain.plasmaContractAddress
      )

      // Bob's transaction eventually does get put into a block
      await childChain.submitTransaction(bobTx)
      await ccHelper.waitForBalanceEq(childChain, bobAccount.address, TRANSFER_AMOUNT)

      // Carol sees that Bob is trying to exit the same input that Alice sent to her.
      const carolTxDecoded = transaction.decodeTxBytes(carolTx)
      const cInput = carolTxDecoded.inputs[0]
      const inflightExit = await ccHelper.waitForEvent(
        childChain,
        'in_flight_exits',
        e => {
          const decoded = transaction.decodeTxBytes(e.txbytes)
          return decoded.inputs.find(input =>
            input.blknum === cInput.blknum &&
            input.txindex === cInput.txindex &&
            input.oindex === cInput.oindex
          )
        }
      )

      // Carol's tx was not put into a block, but it can still be used to challenge Bob's IFE as non-canonical
      const utxoPosOutput = transaction.encodeUtxoPos({
        blknum: fundAliceTx.result.blknum,
        txindex: fundAliceTx.result.txindex,
        oindex: 0
      }).toNumber()

      const unsignInput = transaction.encode(transaction.decodeTxBytes(fundAliceTx.txbytes), { signed: false })
      const unsignCarolTx = transaction.encode(carolTxDecoded, { signed: false })
      receipt = await rootChain.challengeInFlightExitNotCanonical({
        inputTx: unsignInput,
        inputUtxoPos: utxoPosOutput,
        inFlightTx: inflightExit.txbytes,
        inFlightTxInputIndex: 0,
        competingTx: unsignCarolTx,
        competingTxInputIndex: 0,
        competingTxWitness: carolTxDecoded.sigs[0],
        outputGuardPreimage: '0x',
        competingTxPos: '0x',
        competingTxInclusionProof: '0x',
        competingTxConfirmSig: '0x',
        competingTxSpendingConditionOptionalArgs: '0x',
        txOptions: {
          privateKey: carolAccount.privateKey,
          from: carolAccount.address
        }
      })

      // Bob sees the invalid challenge to his IFE
      const invalidChallenge = await ccHelper.waitForEvent(
        childChain,
        'byzantine_events',
        e => e.event === 'invalid_ife_challenge' && e.details.txbytes === exitData.in_flight_tx
      )

      // Bob gets the inclusion proof of his transaction
      const proof = await childChain.inFlightExitProveCanonical(invalidChallenge.details.txbytes)

      // Bob responds to the challenge
      receipt = await rootChain.respondToNonCanonicalChallenge(
        proof.in_flight_txbytes,
        proof.in_flight_tx_pos,
        proof.in_flight_proof,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      )
      console.log(`Bob called RootChain.respondToNonCanonicalChallenge() txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Wait for challenge period
      const utxoPos = transaction.encodeUtxoPos(cInput)
      const toWait = await rcHelper.getTimeToExit(rootChain.plasmaContract, utxoPos)
      console.log(`Waiting for challenge period... ${toWait}ms`)
      await rcHelper.sleep(toWait)

      // Call processExits.
      receipt = await rootChain.processExits(
        transaction.ETH_CURRENCY,
        0,
        10,
        {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address,
          gas: 6000000
        }
      )
      console.log(`Bob called RootChain.processExits() after challenge period: txhash = ${receipt.transactionHash}`)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      await rcHelper.awaitTx(web3, receipt.transactionHash)

      // Get Bob's ETH balance
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      // Bob's IFE was successful, so expect his balance to be
      // INTIIAL_BOB_AMOUNT + TRANSFER_AMOUNT - gas spent
      const expected = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3.utils.toBN(TRANSFER_AMOUNT))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })
})
