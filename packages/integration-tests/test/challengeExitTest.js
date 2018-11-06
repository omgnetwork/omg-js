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
const chai = require('chai')
const assert = chai.assert

const GETH_URL = `http://${config.geth.host}:${config.geth.port}`
const web3 = new Web3(GETH_URL)
const childChain = new ChildChain(`http://${config.watcher.host}:${config.watcher.port}`, `http://${config.childchain.host}:${config.childchain.port}`)
const rootChain = new RootChain(GETH_URL, config.plasmaContract)
const ETH_CURRENCY = '0000000000000000000000000000000000000000'

// NB This test is designed to run against a modified RootChain contract that allows exits after 20 seconds.
const CHALLENGE_PERIOD = 20 * 1000

describe('Challenge exit tests', async () => {
  const INTIIAL_ALICE_AMOUNT = web3.utils.toWei('2', 'ether')
  const INTIIAL_BOB_AMOUNT = web3.utils.toWei('1', 'ether')
  const DEPOSIT_AMOUNT = web3.utils.toWei('1', 'ether')
  const TRANSFER_AMOUNT = web3.utils.toWei('0.2', 'ether')
  let aliceAccount
  let bobAccount

  beforeEach(async () => {
    // Create Alice and Bob's accounts
    // Assume the funding account is accounts[0] and has a blank password
    const accounts = await web3.eth.getAccounts()
    ;[aliceAccount, bobAccount] = await helper.createAndFundManyAccounts(web3, accounts[0], '', [INTIIAL_ALICE_AMOUNT, INTIIAL_BOB_AMOUNT])
    console.log(`Created Alice account ${JSON.stringify(aliceAccount)}`)
    console.log(`Created Bob account ${JSON.stringify(bobAccount)}`)
    // Alice deposits ETH into the Plasma contract
    await helper.depositEthAndWait(rootChain, childChain, aliceAccount.address, DEPOSIT_AMOUNT, aliceAccount.privateKey)
    console.log(`Alice deposited ${DEPOSIT_AMOUNT} into RootChain contract`)
  })

  it('should succesfully challenge a dishonest exit', async () => {
    // Send TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(childChain, aliceAccount.address, bobAccount.address, Number(TRANSFER_AMOUNT), [aliceAccount.privateKey], TRANSFER_AMOUNT)
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

    // Save Alice's latest utxo
    const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
    const aliceDishonestUtxo = aliceUtxos[0]

    // Send another TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(childChain, aliceAccount.address, bobAccount.address, Number(TRANSFER_AMOUNT), [aliceAccount.privateKey], TRANSFER_AMOUNT * 2)
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`)

    // Now Alice wants to cheat and exit with the dishonest utxo
    const exitData = await childChain.getExitData(aliceDishonestUtxo)
    let receipt = await rootChain.startExit(
      aliceAccount.address,
      exitData.utxo_pos.toString(),
      exitData.txbytes,
      exitData.proof,
      exitData.sigs,
      aliceAccount.privateKey
    )
    console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

    // Bob notices this and challenges the exit
    const challengeData = await childChain.getChallengeData(aliceDishonestUtxo)
    assert.hasAllKeys(challengeData, ['txbytes', 'sigs', 'proof', 'eutxoindex', 'cutxopos'])
    receipt = await rootChain.challengeExit(
      bobAccount.address,
      challengeData.cutxopos.toString(),
      challengeData.eutxoindex.toString(),
      challengeData.txbytes,
      challengeData.proof,
      challengeData.sigs,
      bobAccount.privateKey
    )
    console.log(`Bob called RootChain.challengeExit(): txhash = ${receipt.transactionHash}`)

    // Alice waits for the challenge period to be over...
    console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
    await helper.sleep(CHALLENGE_PERIOD)

    // ...and calls finalize exits.
    receipt = await rootChain.finalizeExits(aliceAccount.address, ETH_CURRENCY, 0, 1, aliceAccount.privateKey)
    console.log(`Alice called RootChain.finalizeExits(): txhash = ${receipt.transactionHash}`)

    // Get Alice's ETH balance
    const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Alice's dishonest exit did not successfully complete, so her balance should
    // still be lower than INTIIAL_ALICE_AMOUNT - DEPOSIT_AMOUNT (it's lower because of gas spent)
    const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(web3.utils.toBN(DEPOSIT_AMOUNT))
    assert.isBelow(Number(aliceEthBalance), Number(expected.toString()))
  })

  it('should exit dishonestly if not challenged', async () => {
    // Send TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(childChain, aliceAccount.address, bobAccount.address, Number(TRANSFER_AMOUNT), [aliceAccount.privateKey], TRANSFER_AMOUNT)
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob`)

    // Save Alice's latest utxo
    const aliceUtxos = await childChain.getUtxos(aliceAccount.address)
    const aliceDishonestUtxo = aliceUtxos[0]

    // Send another TRANSFER_AMOUNT from Alice to Bob
    await helper.sendAndWait(childChain, aliceAccount.address, bobAccount.address, Number(TRANSFER_AMOUNT), [aliceAccount.privateKey], TRANSFER_AMOUNT * 2)
    console.log(`Transferred ${TRANSFER_AMOUNT} from Alice to Bob again`)

    // Now Alice wants to cheat and exit with the dishonest utxo
    const exitData = await childChain.getExitData(aliceDishonestUtxo)
    let receipt = await rootChain.startExit(
      aliceAccount.address,
      exitData.utxo_pos.toString(),
      exitData.txbytes,
      exitData.proof,
      exitData.sigs,
      aliceAccount.privateKey
    )
    console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

    // Bob does NOT notice Alice's dishonest exit, so he doesn't challenge it :(

    // Alice waits for the challenge period to be over...
    console.log(`Waiting for challenge period... ${CHALLENGE_PERIOD}ms`)
    await helper.sleep(CHALLENGE_PERIOD)

    // ...and calls finalize exits.
    receipt = await rootChain.finalizeExits(aliceAccount.address, ETH_CURRENCY, 0, 1, aliceAccount.privateKey)
    console.log(`Alice called RootChain.finalizeExits(): txhash = ${receipt.transactionHash}`)

    // Get Alice's ETH balance
    const aliceEthBalance = await web3.eth.getBalance(aliceAccount.address)
    // Alice's dishonest exit worked, so her balance should be around
    // (INTIIAL_ALICE_AMOUNT - DEPOSIT_AMOUNT) + (DEPOSIT_AMOUNT - TRANSFER_AMOUNT) - (some gas)
    const expected = web3.utils.toBN(INTIIAL_ALICE_AMOUNT).sub(web3.utils.toBN(TRANSFER_AMOUNT)).sub(web3.utils.toBN(100000000))
    assert.isAbove(Number(aliceEthBalance), Number(expected.toString()))
  })
})
