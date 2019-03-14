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
const helper = require('./helper')
const Web3 = require('web3')
const ChildChain = require('@omisego/omg-js-childchain')
const RootChain = require('@omisego/omg-js-rootchain')
const { transaction } = require('@omisego/omg-js-util')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain(config.watcher_url, config.childchain_url)
let rootChain

// NB This test waits for at least RootChain.MIN_EXIT_PERIOD so it should be run against a
// modified RootChain contract with a shorter than normal MIN_EXIT_PERIOD.

describe('Challenge exit tests', async () => {
  const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('.1', 'ether')
  const INTIIAL_BOB_AMOUNT = web3.utils.toWei('.1', 'ether')
  const DEPOSIT_AMOUNT = web3.utils.toWei('.01', 'ether')
  const TRANSFER_AMOUNT = web3.utils.toWei('0.002', 'ether')
  let aliceAccount
  let bobAccount

  before(async () => {
    const plasmaContract = await helper.getPlasmaContractAddress(config)
    rootChain = new RootChain(web3, plasmaContract.contract_addr)
  })

  beforeEach(async () => {
    // Create Alice and Bob's accounts
    ;[aliceAccount, bobAccount] = await helper.createAndFundManyAccounts(web3, config, [INTIIAL_ALICE_AMOUNT, INTIIAL_BOB_AMOUNT])
    console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
    console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
  })

  afterEach(async () => {
    // Send back any leftover eth
    helper.returnFunds(web3, config, aliceAccount)
    helper.returnFunds(web3, config, bobAccount)
  })

  it('should succesfully challenge a dishonest exit', async () => {
    // Alice deposits ETH into the Plasma contract
    let receipt = await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
    console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)

    // Keep track of how much Alice spends on gas
    let aliceSpentOnGas = await helper.spentOnGas(web3, receipt)

    // Send TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(
      childChain,
      aliceAccount.address,
      bobAccount.address,
      Number(TRANSFER_AMOUNT),
      transaction.ETH_CURRENCY,
      [aliceAccount.privateKey],
      TRANSFER_AMOUNT
    )

    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

    // Save Alice's latest utxo
    const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
    const aliceDishonestUtxo = aliceUtxos[0]

    // Send another TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(
      childChain,
      aliceAccount.address,
      bobAccount.address,
      Number(TRANSFER_AMOUNT),
      transaction.ETH_CURRENCY,
      [aliceAccount.privateKey],
      TRANSFER_AMOUNT * 2
    )
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`)

    // Now Alice wants to cheat and exit with the dishonest utxo
    const exitData = await childChain.getExitData(aliceDishonestUtxo)
    receipt = await rootChain.startStandardExit(
      exitData.utxo_pos,
      exitData.txbytes,
      exitData.proof,
      {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    )
    console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)
    aliceSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

    // Bob calls watcher/status.get and sees the invalid exit attempt...
    const invalidExit = await helper.waitForEvent(childChain, 'invalid_exit')
    assert.equal(transaction.encodeUtxoPos(aliceDishonestUtxo), invalidExit.details.utxo_pos)

    // ...and challenges the exit
    const challengeData = await childChain.getChallengeData(invalidExit.details.utxo_pos)
    assert.hasAllKeys(challengeData, ['input_index', 'utxo_pos', 'sig', 'txbytes'])
    receipt = await rootChain.challengeStandardExit(
      challengeData.utxo_pos,
      challengeData.txbytes,
      challengeData.input_index,
      challengeData.sig,
      {
        privateKey: bobAccount.privateKey,
        from: bobAccount.address
      }
    )
    console.log(`Bob called RootChain.challengeExit(): txhash = ${receipt.transactionHash}`)

    // Keep track of how much Bob spends on gas
    let bobSpentOnGas = await helper.spentOnGas(web3, receipt)

    // Alice waits for the challenge period to be over...
    const toWait = await helper.getTimeToExit(rootChain.plasmaContract, exitData.utxo_pos)
    console.log(`Waiting for challenge period... ${toWait}ms`)
    await helper.sleep(toWait)

    // ...and calls finalize exits.
    receipt = await rootChain.processExits(
      transaction.ETH_CURRENCY,
      0,
      1,
      {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    )
    console.log(`Alice called RootChain.processExits(): txhash = ${receipt.transactionHash}`)
    aliceSpentOnGas.iadd(await helper.spentOnGas(web3, receipt))

    // Get Alice's ETH balance
    const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Alice's dishonest exit did not successfully complete, so her balance should be
    // INTIIAL_ALICE_AMOUNT - DEPOSIT_AMOUNT - STANDARD_EXIT_BOND - gas spent
    const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT)
      .sub(web3.utils.toBN(DEPOSIT_AMOUNT))
      .sub(web3.utils.toBN(rootChain.getStandardExitBond()))
      .sub(aliceSpentOnGas)
    assert.equal(aliceEthBalance.toString(), expected.toString())

    // Bob successfully challenged the exit, so he should have received the exit bond
    const bobEthBalance = await web3.eth.getBalance(bobAccount.address)
    const bobExpectedBalance = web3.utils.toBN(INTIIAL_BOB_AMOUNT)
      .add(web3.utils.toBN(rootChain.getStandardExitBond()))
      .sub(bobSpentOnGas)
    assert.equal(bobEthBalance.toString(), bobExpectedBalance.toString())
  })

  // Skip this test as it leaves the childchain byzantine
  it.skip('should exit dishonestly if not challenged', async () => {
    // Send TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(
      childChain,
      aliceAccount.address,
      bobAccount.address,
      Number(TRANSFER_AMOUNT),
      transaction.ETH_CURRENCY,
      [aliceAccount.privateKey],
      TRANSFER_AMOUNT
    )
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

    // Save Alice's latest utxo
    const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
    const aliceDishonestUtxo = aliceUtxos[0]

    // Send another TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(
      childChain,
      aliceAccount.address,
      bobAccount.address,
      Number(TRANSFER_AMOUNT),
      transaction.ETH_CURRENCY,
      [aliceAccount.privateKey],
      TRANSFER_AMOUNT * 2
    )
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`)

    // Now Alice wants to cheat and exit with the dishonest utxo
    const exitData = await childChain.getExitData(aliceDishonestUtxo)
    let receipt = await rootChain.startStandardExit(
      exitData.utxo_pos,
      exitData.txbytes,
      exitData.proof,
      {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    )
    console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

    // Bob does NOT notice Alice's dishonest exit, so he doesn't challenge it :(

    // Alice waits for the challenge period to be over...
    const toWait = await helper.getTimeToExit(rootChain.plasmaContract, exitData.utxo_pos)
    console.log(`Waiting for challenge period... ${toWait}ms`)
    await helper.sleep(toWait)

    // ...and calls finalize exits.
    receipt = await rootChain.processExits(
      transaction.ETH_CURRENCY,
      0,
      1,
      {
        privateKey: aliceAccount.privateKey,
        from: aliceAccount.address
      }
    )
    console.log(`Alice called RootChain.finalizeExits(): txhash = ${receipt.transactionHash}`)

    // Get Alice's ETH balance
    const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Alice's dishonest exit worked, so her balance should be around
    // (INTIIAL_ALICE_AMOUNT - DEPOSIT_AMOUNT) + (DEPOSIT_AMOUNT - TRANSFER_AMOUNT) - (some gas)
    const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(web3.utils.toBN(TRANSFER_AMOUNT)).sub(web3.utils.toBN(100000000))
    assert.isAbove(Number(aliceEthBalance), Number(expected.toString()))
  })
})
