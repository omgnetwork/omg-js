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
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
let rootChain

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.

describe('Challenge exit tests', function () {
  before(async function () {
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('Challenge a standard exit (ci-enabled)', function () {
    let INTIIAL_ALICE_RC_AMOUNT
    let INTIIAL_BOB_RC_AMOUNT
    let INTIIAL_ALICE_CC_AMOUNT
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount
    before(async function () {
      // Create Alice and Bob's accounts
      INTIIAL_ALICE_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
      INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
      INTIIAL_ALICE_CC_AMOUNT = web3.utils.toWei('.001', 'ether')
      TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')

      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      bobAccount = rcHelper.createAccount(web3)
      console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_CC_AMOUNT, transaction.ETH_CURRENCY),
        // Give some ETH to Alice on the root chain
        faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_ALICE_RC_AMOUNT)
      ])
      // Give some ETH to Bob on the root chain
      await faucet.fundRootchainEth(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)

      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(childChain, aliceAccount.address, INTIIAL_ALICE_CC_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_RC_AMOUNT),
        rcHelper.waitForEthBalanceEq(web3, bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
    })

    after(async function () {
      try {
        // Send any leftover funds back to the faucet
        await faucet.returnFunds(web3, aliceAccount)
        await faucet.returnFunds(web3, bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should succesfully challenge a dishonest exit', async function () {
      // Send TRANSFER_AMOUNT from Alice to Bob
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

      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // Save Alice's latest utxo
      const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      const aliceDishonestUtxo = aliceUtxos[0]

      // Send another TRANSFER_AMOUNT from Alice to Bob
      await ccHelper.sendAndWait(
        childChain,
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        transaction.ETH_CURRENCY,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT * 2,
        rootChain.plasmaContractAddress
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`)

      // Now Alice wants to cheat and exit with the dishonest utxo

      const exitData = await childChain.getExitData(aliceDishonestUtxo)
      const standardExitReceipt = await rootChain.startStandardExit({
        outputId: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(`Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`)
      const aliceSpentOnGas = await rcHelper.spentOnGas(web3, standardExitReceipt)

      // Bob calls watcher/status.get and sees the invalid exit attempt...
      const invalidExitUtxoPos = transaction.encodeUtxoPos(aliceDishonestUtxo).toString()
      const invalidExit = await ccHelper.waitForEvent(
        childChain,
        'byzantine_events',
        e => e.event === 'invalid_exit' && e.details.utxo_pos.toString() === invalidExitUtxoPos
      )

      // ...and challenges the exit
      const challengeData = await childChain.getChallengeData(invalidExit.details.utxo_pos)
      assert.hasAllKeys(challengeData, ['input_index', 'exit_id', 'exiting_tx', 'sig', 'txbytes'])
      let receipt = await rootChain.challengeStandardExit({
        standardExitId: challengeData.exit_id,
        exitingTx: challengeData.exiting_tx,
        challengeTx: challengeData.txbytes,
        inputIndex: challengeData.input_index,
        challengeTxSig: challengeData.sig,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      console.log(`Bob called RootChain.challengeExit(): txhash = ${receipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      const bobSpentOnGas = await rcHelper.spentOnGas(web3, receipt)

      // Alice waits for the challenge period to be over...
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: standardExitReceipt.blockNumber,
        submissionBlockNumber: aliceDishonestUtxo.blknum
      })
      console.log(`Waiting for challenge period... ${msUntilFinalization}ms`)
      await rcHelper.sleep(msUntilFinalization)

      // ...and calls finalize exits.
      receipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address
        }
      })
      console.log(`Alice called RootChain.processExits(): txhash = ${receipt.transactionHash}`)
      aliceSpentOnGas.iadd(await rcHelper.spentOnGas(web3, receipt))

      // Get Alice's ETH balance
      const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
      // Alice's dishonest exit did not successfully complete, so her balance should be
      // INTIIAL_ALICE_RC_AMOUNT - STANDARD_EXIT_BOND - gas spent
      const { bonds } = await rootChain.getPaymentExitGame()
      const expected = web3.utils.toBN(INTIIAL_ALICE_RC_AMOUNT)
        .sub(web3.utils.toBN(bonds.standardExit))
        .sub(aliceSpentOnGas)
      assert.equal(aliceEthBalance.toString(), expected.toString())

      // Bob successfully challenged the exit, so he should have received the exit bond
      const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      const bobExpectedBalance = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT)
        .add(web3.utils.toBN(bonds.standardExit))
        .sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), bobExpectedBalance.toString())
    })
  })
})
