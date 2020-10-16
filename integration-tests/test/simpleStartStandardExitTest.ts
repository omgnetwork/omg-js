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

// NMTODO: run tests with watchersecurity url

describe('simpleStartStandardExitTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })

    // This test itself would introduce some exits inside the queue
    // As a result, being a nice member that each time it tries to clean up the queue
    // so the next time the test is run (if after challenge period) it will garbage collect its own exit
    const queue = await omgjs.getExitQueue(OmgJS.currency.ETH)
    if (queue.length) {
      console.log(`Help cleaning up ${queue.length} exits inside the queue...`)
      const ethExitReceipt = await omgjs.processExits({
        currency: OmgJS.currency.ETH,
        exitId: 0,
        maxExitsToProcess: queue.length,
        txOptions: {
          privateKey: faucet.fundAccount.privateKey,
          from: faucet.fundAccount.address,
          gasLimit: 3000000
        }
      })
      if (ethExitReceipt) {
        console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`)
        await rcHelper.awaitTx(ethExitReceipt.transactionHash)
      }
    }
  })

  describe('childchain transaction start exit', function () {
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
        ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT),
        rcHelper.waitForEthBalanceEq(bobAccount.address, INTIIAL_BOB_RC_AMOUNT)
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

    it('should successfully start standard exit for a ChildChain transaction', async function () {
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

      // Send TRANSFER_AMOUNT from Alice to Bob again to avoid exit all utxos
      // childchain.getBalance does not works well when there is no utxo
      await ccHelper.sendAndWait(
        aliceAccount.address,
        bobAccount.address,
        TRANSFER_AMOUNT,
        OmgJS.currency.ETH,
        aliceAccount.privateKey,
        TRANSFER_AMOUNT
      )

      console.log(`Transferred another ${TRANSFER_AMOUNT} from Alice to Bob`)

      await ccHelper.waitForBalanceEq(bobAccount.address, 2 * Number(TRANSFER_AMOUNT))

      // Bob wants to exit
      const bobUtxos = await omgjs.getUtxos(bobAccount.address)
      assert.equal(bobUtxos.length, 2)
      assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

      // Get the exit data
      const utxoToExit = bobUtxos[0]
      const exitData = await omgjs.getExitData(utxoToExit)
      assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const preBalance = await omgjs.getBalance(bobAccount.address)

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

      await ccHelper.waitForBalanceEq(bobAccount.address, Number(preBalance[0].amount) - utxoToExit.amount)
    })
  })
})
