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

const faucetName = path.basename(__filename)

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('deleteNonPiggybackedInFlightExitTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('delete ife if not piggybacked', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether')
    const INTIIAL_BOB_RC_AMOUNT = web3Utils.toWei('.5', 'ether')
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

    it('should succesfully delete an ife if not piggybacked after the first phase and return ife bond', async function () {
      // Send TRANSFER_AMOUNT from Alice to Bob
      const { txbytes, result } = await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      )
      console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

      // Bob starts an in-flight exit.
      const exitData = await omgjs.inFlightExitGetData(txbytes)
      const ifeReceipt = await omgjs.startInFlightExit({
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
      const bobSpentOnGas = new BN(0)
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(ifeReceipt))

      // Check Bob has paid the ife bond
      const { bonds } = await omgjs.getPaymentExitGame()
      let bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      let expected = new BN(INTIIAL_BOB_RC_AMOUNT)
        .sub(bobSpentOnGas)
        .sub(web3Utils.toBN(bonds.inflightExit.toString()))
      assert.equal(bobEthBalance.toString(), expected.toString())

      // Wait for half of the challenge period
      const { msUntilFinalization } = await omgjs.getExitTime({
        exitRequestBlockNumber: ifeReceipt.blockNumber,
        submissionBlockNumber: result.blknum
      })
      const msUntilSecondPhase = msUntilFinalization / 2
      console.log(`Waiting for second phase of challenge period... ${msUntilSecondPhase / 60000} minutes`)
      await rcHelper.sleep(msUntilSecondPhase)

      const exitId = await omgjs.getInFlightExitId(exitData.in_flight_tx)
      const deleteIFEReceipt = await omgjs.deleteNonPiggybackedInFlightExit({
        exitId,
        txOptions: {
          privateKey: bobAccount.privateKey,
          from: bobAccount.address
        }
      })
      bobSpentOnGas.iadd(await rcHelper.spentOnGas(deleteIFEReceipt))
      console.log('Bob called deleteNonPiggybackedInFlightExit: ', deleteIFEReceipt.transactionHash)

      // Bob started an ife and paid a bond, but after deleting the ife, he should get his bond back
      // therefore, it is expected the cost of this cycle only cost Bob gas
      bobEthBalance = await omgjs.getRootchainETHBalance(bobAccount.address)
      expected = new BN(INTIIAL_BOB_RC_AMOUNT).sub(bobSpentOnGas)
      assert.equal(bobEthBalance.toString(), expected.toString())
    })
  })
})
