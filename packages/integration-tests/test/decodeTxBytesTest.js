/*
Copyright 2018 OmiseGO Pte Ltd

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

describe('decodeTxBytesTest.js (ci-enabled)', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.rootchainContract })

  before(async function () {
    await faucet.init(rootChain, childChain, web3, config)
  })

  describe('Decode txBytes exit data', function () {
    const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
    const DEPOSIT_AMOUNT = web3.utils.toWei('.0001', 'ether')

    let aliceAccount

    beforeEach(async function () {
      // Create and fund Alice's account
      aliceAccount = rcHelper.createAccount(web3)
      console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
      await faucet.fundRootchainEth(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )
      await rcHelper.waitForEthBalanceEq(
        web3,
        aliceAccount.address,
        INTIIAL_ALICE_AMOUNT
      )
    })

    afterEach(async function () {
      try {
        await faucet.returnFunds(web3, aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should able to decode back the txBytesfrom exitData', async function () {
      // Alice deposits ETH into the Plasma contract
      await rootChain.deposit({
        amount: DEPOSIT_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })
      await ccHelper.waitForBalanceEq(
        childChain,
        aliceAccount.address,
        DEPOSIT_AMOUNT
      )
      console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
      // Get Alice's deposit utxo
      const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
      assert.equal(aliceUtxos.length, 1)
      assert.equal(aliceUtxos[0].amount.toString(), DEPOSIT_AMOUNT)

      // Get the exit data
      const utxoToExit = aliceUtxos[0]
      const exitData = await childChain.getExitData(utxoToExit)
      assert.hasAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])
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
        transaction.decodeTxBytes(exitData.txbytes)
      )
    })
  })
})
