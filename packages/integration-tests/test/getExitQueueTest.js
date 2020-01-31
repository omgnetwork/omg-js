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

const { assert, should, use } = require('chai')
const chaiAsPromised = require('chai-as-promised')
const RootChain = require('@omisego/omg-js-rootchain')
const ChildChain = require('@omisego/omg-js-childchain')
const { transaction } = require('@omisego/omg-js-util')
const Web3 = require('web3')

const faucet = require('../helpers/faucet')
const config = require('../test-config')
const rcHelper = require('../helpers/rootChainHelper')
const ccHelper = require('../helpers/childChainHelper')

should()
use(chaiAsPromised)

const path = require('path')
const faucetName = path.basename(__filename)

describe('getExitQueueTest.js', function () {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node))
  const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })
  const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

  const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
  const DEPOSIT_AMOUNT = web3.utils.toWei('.0001', 'ether')
  let aliceAccount

  before(async function () {
    await faucet.init({ rootChain, childChain, web3, config, faucetName })
  })

  beforeEach(async function () {
    aliceAccount = rcHelper.createAccount(web3)
    await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
  })

  afterEach(async function () {
    try {
      await faucet.returnFunds(aliceAccount)
    } catch (err) {
      console.warn(`Error trying to return funds to the faucet: ${err}`)
    }
  })

  it('should be able to retrieve an ETH exit queue', async function () {
    let queue = await rootChain.getExitQueue()
    if (queue.length) {
      const ethExitReceipt = await rootChain.processExits({
        token: transaction.ETH_CURRENCY,
        exitId: 0,
        maxExitsToProcess: queue.length,
        txOptions: {
          privateKey: aliceAccount.privateKey,
          from: aliceAccount.address,
          gas: 6000000
        }
      })
      if (ethExitReceipt) {
        console.log(`ETH exits processing: ${ethExitReceipt.transactionHash}`)
        await rcHelper.awaitTx(web3, ethExitReceipt.transactionHash)
      }
    }
    queue = await rootChain.getExitQueue()
    assert.lengthOf(queue, 0)

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

    const standardExitReceipt = await rootChain.startStandardExit({
      utxoPos: exitData.utxo_pos,
      outputTx: exitData.txbytes,
      inclusionProof: exitData.proof,
      txOptions: {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    })
    console.log(`Alice called RootChain.startExit(): txhash = ${standardExitReceipt.transactionHash}`)

    queue = await rootChain.getExitQueue()
    assert.lengthOf(queue, 1)

    // Check that Alices exitid does indeed show up in the queue
    const alicesExitId = await rootChain.getStandardExitId({
      txBytes: exitData.txbytes,
      utxoPos: exitData.utxo_pos,
      isDeposit: true
    })
    const { exitId, exitableAt } = queue[0]
    assert.equal(exitId, alicesExitId)

    const { msUntilFinalization, scheduledFinalizationTime } = await rootChain.getExitTime({
      exitRequestBlockNumber: standardExitReceipt.blockNumber,
      submissionBlockNumber: utxoToExit.blknum
    })

    const differenceInFinalizationTime = Math.abs(scheduledFinalizationTime - exitableAt)
    // scheduledFinalizationTime adds a 5 second buffer so this tests that the calculation is consistent
    assert.isAtMost(differenceInFinalizationTime, 6)

    // Wait for challenge period
    console.log(`Waiting for challenge period... ${msUntilFinalization / 60000} minutes`)
    await rcHelper.sleep(msUntilFinalization)
    const processReceipt = await rootChain.processExits({
      token: transaction.ETH_CURRENCY,
      exitId: 0,
      maxExitsToProcess: queue.length,
      txOptions: {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    })
    console.log(
      `Alice called RootChain.processExits() after challenge period: txhash = ${processReceipt.transactionHash}`
    )

    queue = await rootChain.getExitQueue()
    assert.lengthOf(queue, 0)
  })
})
