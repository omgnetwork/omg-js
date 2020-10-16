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

import OmgJS from '../../..';

import faucet from '../../helpers/faucet';
import * as rcHelper from '../../helpers/rootChainHelper';
import * as ccHelper from '../../helpers/childChainHelper';
import config from '../../test-config';

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

// NMTODO: run these tests with watchersecurityurl instead

describe('simpleEthTransferTest.js', function () {
  let feeEth

  before(async function () {
    await faucet.init({ faucetName })
    const fees = (await omgjs.getFees())['1']
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH)
    feeEth = amount
  })

  describe('Simple ETH', function () {
    const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('.1', 'ether')
    let TRANSFER_AMOUNT
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      // TRANSFER_AMOUNT is deliberately bigger than Number.MAX_SAFE_INTEGER to cause rounding errors if not properly handled
      TRANSFER_AMOUNT = new BN('20000000000000123')
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should transfer ETH on the childchain', async function () {
      // Check utxos on the child chain
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 1)
      assert.equal(utxos[0].amount.toString(), INTIIAL_ALICE_AMOUNT)
      assert.equal(utxos[0].currency, OmgJS.currency.ETH)

      const CHANGE_AMOUNT = new BN(utxos[0].amount).sub(new BN(TRANSFER_AMOUNT)).sub(new BN(feeEth))
      const txBody = {
        inputs: [utxos[0]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: TRANSFER_AMOUNT
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: OmgJS.currency.ETH,
          amount: CHANGE_AMOUNT
        }]
      }

      const typedData = omgjs.getTypedData(txBody)
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [aliceAccount.privateKey] })
      assert.equal(signatures.length, 1)
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's balance should be TRANSFER_AMOUNT
      let balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)

      // Alice's balance should be CHANGE_AMOUNT
      balance = await omgjs.getBalance(aliceAccount.address)
      assert.equal(balance.length, 1)
      assert.equal(balance[0].amount.toString(), CHANGE_AMOUNT.toString())
    })
  })
})
