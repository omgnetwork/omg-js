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

describe('deleteNonPiggybackedInFlightExitTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
  })

  describe('delete ife if not piggybacked', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3.utils.toWei('.1', 'ether')
    const TRANSFER_AMOUNT = web3.utils.toWei('0.0002', 'ether')

    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      bobAccount = rcHelper.createAccount(web3)

      await Promise.all([
        // Give some ETH to Alice on the child chain
        faucet.fundChildchain(
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT,
          transaction.ETH_CURRENCY
        ),
        // Give some ETH to Bob on the root chain
        faucet.fundRootchainEth(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
      ])
      // Wait for finality
      await Promise.all([
        ccHelper.waitForBalanceEq(
          childChain,
          aliceAccount.address,
          INTIIAL_ALICE_AMOUNT
        ),
        rcHelper.waitForEthBalanceEq(
          web3,
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

    it('should succesfully delete an ife if not piggybacked after the first phase and return ife bond', async function () {
      // Send TRANSFER_AMOUNT from Alice to Bob
      const { txbytes, result } = await ccHelper.sendAndWait(
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

      // Bob starts an in-flight exit.
      const exitData = await childChain.inFlightExitGetData(txbytes)
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
      console.log(`Bob called RootChain.startInFlightExit(): txhash = ${ifeReceipt.transactionHash}`)

      // Keep track of how much Bob spends on gas
      const bobSpentOnGas = numberToBN(0)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, ifeReceipt))

      // Check Bob has paid the ife bond
      const { bonds } = await rootChain.getPaymentExitGame()
      let bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      let expected = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT)
        .sub(bobSpentOnGas)
        .sub(web3.utils.toBN(bonds.inflightExit))
      assert.equal(bobEthBalance.toString(), expected.toString())

      // Wait for half of the challenge period
      const { msUntilFinalization } = await rootChain.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: result.blknum
      })
      const msUntilSecondPhase = msUntilFinalization / 2
      console.log(`Waiting for second phase of challenge period... ${msUntilSecondPhase / 60000} minutes`)
      await rcHelper.sleep(msUntilSecondPhase)

      const exitId = await rootChain.getInFlightExitId({ txBytes: exitData.in_flight_tx })
      const deleteIFEReceipt = await rootChain.deleteNonPiggybackedInFlightExit({
        exitId,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(web3, deleteIFEReceipt))
      console.log('Bob called deleteNonPiggybackedInFlightExit: ', deleteIFEReceipt.transactionHash)

      // Bob started an ife and paid a bond, but after deleting the ife, he should get his bond back
      // therefore, it is expected the cost of this cycle only cost Bob gas
      bobEthBalance = await web3.eth.getBalance(bobAccount.address)
      expected = web3.utils.toBN(INTIIAL_BOB_RC_AMOUNT).sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })
})
