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
const chai = require('chai')
const assert = chai.assert

const path = require('path')
const faucetName = path.basename(__filename)

describe('simpleStartStandardExitTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })

  before(async function () {
    const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url, plasmaContractAddress: config.plasmaframework_contract_address })
    await faucet.init({ rootChain, childChain, web3, config, faucetName })

    // This test itself would introduce some exits inside the queue
    // As a result, being a nice member that each time it tries to clean up the queue
    // so the next time the test is run (if after challenge period) it will garbage collect its own exit
    const queue = await rootChain.getExitQueue()
    if (queue.length) {
      console.log(`Help cleaning up ${queue.length} exits inside the queue...`)
      const ethExitReceipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: queue.length,
        txOptions: {
          privateKey: faucet.fundAccount.privateKey,
          from: faucet.fundAccount.address,
          gas: 3000000
        }
      })
      if (ethExitReceipt) {
        console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`)
        await rcHelper.awaitTx(web3, ethExitReceipt.transactionHash)
      }
    }
  })

  describe('hitting watcher-info service only', function () {
    const childChain = new ChildChain({
      watcherUrl: config.watcher_url,
      watcherProxyUrl: config.watcher_proxy_url,
      plasmaContractAddress: config.plasmaframework_contract_address
    })

    testChildchainTransactionStartExit(childChain)
  })

  describe('hitting both watcher-security and watcher-info service', function () {
    const childChain = new ChildChain({
      watcherUrl: config.watcher_url,
      watcherSecurityUrl: config.watcher_security_url,
      watcherProxyUrl: config.watcher_proxy_url,
      plasmaContractAddress: config.plasmaframework_contract_address
    })

    testChildchainTransactionStartExit(childChain)
  })

  function testChildchainTransactionStartExit (childChain) {
    describe('childchain transaction start exit', function () {
      const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.001', 'ether')
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

      it('should successfully start standard exit for a ChildChain transaction', async function () {
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

        // Send TRANSFER_AMOUNT from Alice to Bob again to avoid exit all utxos
        // childchain.getBalance does not works well when there is no utxo
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

        console.log(`Transferred another ${TRANSFER_AMOUNT} from Alice to Bob`)

        await ccHelper.waitForBalanceEq(
          childChain,
          bobAccount.address,
          2 * TRANSFER_AMOUNT
        )

        // Bob wants to exit
        const bobUtxos = await childChain.getUtxos(bobAccount.address)
        assert.equal(bobUtxos.length, 2)
        assert.equal(bobUtxos[0].amount.toString(), TRANSFER_AMOUNT)

        // Get the exit data
        const utxoToExit = bobUtxos[0]
        const exitData = await childChain.getExitData(utxoToExit)
        assert.containsAllKeys(exitData, ['txbytes', 'proof', 'utxo_pos'])

        const preBalance = await childChain.getBalance(bobAccount.address)

        const startStandardExitReceipt = await rootChain.startStandardExit({
          utxoPos: exitData.utxo_pos,
          outputTx: exitData.txbytes,
          inclusionProof: exitData.proof,
          txOptions: {
            privateKey: bobAccount.privateKey,
            from: bobAccount.address
          }
        })
        console.log(
          `Bob called RootChain.startExit(): txhash = ${startStandardExitReceipt.transactionHash}`
        )

        await ccHelper.waitForBalanceEq(
          childChain,
          bobAccount.address,
          preBalance[0].amount - utxoToExit.amount
        )
      })
    })
  }
})
