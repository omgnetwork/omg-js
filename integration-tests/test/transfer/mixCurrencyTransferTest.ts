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

describe('mixCurrencyTransferTest.js', function () {
  let feeEth

  before(async function () {
    await faucet.init({ faucetName })
    const fees = (await omgjs.getFees())['1']
    const { amount } = fees.find(f => f.currency === OmgJS.currency.ETH)
    feeEth = amount
  })

  describe('Mixed currency transfer', function () {
    const ERC20_CURRENCY = config.erc20_contract_address
    const INTIIAL_ALICE_AMOUNT_ETH = web3Utils.toWei('0.001', 'ether')
    const INTIIAL_ALICE_AMOUNT_ERC20 = 2
    const TRANSFER_AMOUNT_ETH = new BN(web3Utils.toWei('0.0004', 'ether'))
    const TRANSFER_AMOUNT_ERC20 = 1
    let aliceAccount
    let bobAccount

    beforeEach(async function () {
      aliceAccount = rcHelper.createAccount()
      bobAccount = rcHelper.createAccount()
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH, OmgJS.currency.ETH)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      // Give some ERC20 tokens to Alice on the child chain
      await faucet.fundChildchain(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
      await ccHelper.waitForBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ERC20, ERC20_CURRENCY)
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
        await faucet.returnFunds(bobAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should transfer ETH and ERC20 tokens on the childchain', async function () {
      // Check utxos on the child chain
      const utxos = await omgjs.getUtxos(aliceAccount.address)
      assert.equal(utxos.length, 2)
      assert.equal(utxos[0].amount, Number(INTIIAL_ALICE_AMOUNT_ETH))
      assert.equal(utxos[0].currency, OmgJS.currency.ETH)
      assert.equal(utxos[1].amount, INTIIAL_ALICE_AMOUNT_ERC20)
      assert.equal(utxos[1].currency.toLowerCase(), ERC20_CURRENCY.toLowerCase())

      const CHANGE_AMOUNT_ETH = new BN(utxos[0].amount).sub(TRANSFER_AMOUNT_ETH).sub(new BN(feeEth))
      const CHANGE_AMOUNT_ERC20 = utxos[1].amount - TRANSFER_AMOUNT_ERC20
      const txBody = {
        inputs: [utxos[0], utxos[1]],
        outputs: [{
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: OmgJS.currency.ETH,
          amount: TRANSFER_AMOUNT_ETH
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: OmgJS.currency.ETH,
          amount: CHANGE_AMOUNT_ETH
        }, {
          outputType: 1,
          outputGuard: bobAccount.address,
          currency: ERC20_CURRENCY,
          amount: TRANSFER_AMOUNT_ERC20
        }, {
          outputType: 1,
          outputGuard: aliceAccount.address,
          currency: ERC20_CURRENCY,
          amount: CHANGE_AMOUNT_ERC20
        }]
      }

      const typedData = omgjs.getTypedData(txBody)
      const signatures = omgjs.signTransaction({ typedData, privateKeys: [aliceAccount.privateKey, aliceAccount.privateKey] })
      assert.equal(signatures.length, 2)
      const signedTx = omgjs.buildSignedTransaction({ typedData, signatures })
      const result = await omgjs.submitTransaction(signedTx)
      console.log(`Submitted transaction: ${result.txhash}`)

      // Bob's ETH balance should be TRANSFER_AMOUNT_ETH
      let balance = await ccHelper.waitForBalanceEq(bobAccount.address, Number(TRANSFER_AMOUNT_ETH))
      // Bob's ERC20 balance should be TRANSFER_AMOUNT_ERC20
      balance = await ccHelper.waitForBalanceEq(bobAccount.address, TRANSFER_AMOUNT_ERC20, ERC20_CURRENCY)
      balance = balance.map(i => ({ ...i, currency: i.currency.toLowerCase() }))
      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: OmgJS.currency.ETH, amount: Number(TRANSFER_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY.toLowerCase(), amount: TRANSFER_AMOUNT_ERC20 })

      // Check Alice's balance
      balance = await omgjs.getBalance(aliceAccount.address)
      balance = balance.map(i => ({ ...i, currency: i.currency.toLowerCase() }))

      assert.equal(balance.length, 2)
      assert.deepInclude(balance, { currency: OmgJS.currency.ETH, amount: Number(CHANGE_AMOUNT_ETH.toString()) })
      assert.deepInclude(balance, { currency: ERC20_CURRENCY.toLowerCase(), amount: CHANGE_AMOUNT_ERC20 })
    })
  })
})
