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
const Web3 = require('web3')

const faucet = require('../helpers/testFaucet')
const config = require('../test-config')
const rcHelper = require('../helpers/rootChainHelper')
const ccHelper = require('../helpers/childChainHelper')

should()
use(chaiAsPromised)

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))

let rootChain
let childChain
let aliceAccount
const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
const DEPOSIT_AMOUNT = web3.utils.toWei('.0001', 'ether')

describe('getExitQueue tests', function () {
  beforeEach(async function () {
    aliceAccount = rcHelper.createAccount(web3)
    console.log(`Created new account ${JSON.stringify(aliceAccount)}`)
    const plasmaContract = await rcHelper.getPlasmaContractAddress(config)
    rootChain = new RootChain({ web3, plasmaContractAddress: plasmaContract.contract_addr })
    childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })

    await faucet.init(rootChain, childChain, web3, config)
    await faucet.fundRootchainEth(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
    await rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT)
  })

  afterEach(async function () {
    try {
      await faucet.returnFunds(web3, aliceAccount)
    } catch (err) {
      console.warn(`Error trying to return funds to the faucet: ${err}`)
    }
  })

  it.only('should be able to retrieve an ETH exit queue', async function () {
    // process exit to clear the queue

    const beforeQueue = await rootChain.getExitQueue()
    assert.lengthOf(beforeQueue, 0)

    await rcHelper.depositEth({
      rootChain,
      address: aliceAccount.address,
      amount: DEPOSIT_AMOUNT,
      privateKey: aliceAccount.privateKey
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

    const afterQueue = await rootChain.getExitQueue()
    assert.lengthOf(afterQueue, 1)

    // process exit to clear the queue
  })

  it('should be able to retrieve an ERC20 exit queue', async function () {
    const token = config.testErc20Contract
    const beforeQueue = await rootChain.getExitQueue(token)
    assert.lengthOf(beforeQueue, 0)

    // TODO: add actual exit and test if it shows up in the queue

    const afterQueue = await rootChain.getExitQueue()
    assert.lengthOf(afterQueue, 1)

    // process exit to clear the queue
  })
})
