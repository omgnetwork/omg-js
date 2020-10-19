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

describe('decodeTxBytesTest.js', function () {
  before(async function () {
    await faucet.init({ faucetName })
  })

  describe('Decode txBytes exit data', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether')
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

    it('should be able to decode back the txBytesfrom exitData', async function () {
      // Alice deposits ETH into the Plasma contract
      await omgjs.deposit({
        amount: DEPOSIT_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })
      await ccHelper.waitForBalanceEq(aliceAccount.address, DEPOSIT_AMOUNT)
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
      // Get Alice's deposit utxo
      const aliceUtxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 1)
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

      // Get the exit data
      const utxoToExit = aliceUtxos[0]
      const exitData = await omgjs.getExitData(utxoToExit)
      assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

      const decodedTransaction = omgjs.decodeTransaction(exitData.txbytes)
      assert.deepEqual(
        {
          txType: 1,
          txData: 0,
          inputs: [],
          outputs: [
            {
              amount: DEPOSIT_AMOUNT,
              outputGuard: aliceAccount.address,
              outputType: 1,
              currency: '0x0000000000000000000000000000000000000000'
            }
          ],
          metadata:
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        },
        decodedTransaction
      )
    })
  })
})
