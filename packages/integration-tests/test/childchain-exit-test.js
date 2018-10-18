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

describe('Childchain transfer tests', async () => {
  const INTIIAL_SRC_AMOUNT = web3.utils.toWei('2', 'ether')
  const INTIIAL_DEST_AMOUNT = web3.utils.toWei('1', 'ether')
  const TRANSFER_AMOUNT = web3.utils.toWei('1', 'ether')
  let srcAccount
  let destAccount

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    // Create and fund src account
    srcAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_SRC_AMOUNT)
    console.log(`Created src account ${JSON.stringify(srcAccount)}`)
    // Create dest account
    destAccount = await helper.createAndFundAccount(web3, accounts[0], '', INTIIAL_DEST_AMOUNT)
    console.log(`Created dest account ${JSON.stringify(destAccount)}`)
  })

  it('should deposit funds to the Plasma contract, then transfer on the childchain', async () => {
    // Deposit ETH into the Plasma contract
    await rootChain.depositEth(TRANSFER_AMOUNT, srcAccount.address, srcAccount.privateKey)

    // Wait for transaction to be mined
    let balance = await helper.waitForBalance(childChain, srcAccount.address, TRANSFER_AMOUNT)
    // Check src account balance is correct
    assert.equal(balance.length, 1)
    assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)
    console.log(`Deposited ${TRANSFER_AMOUNT} into source account ${srcAccount.address}`)

    // Check utxos on the child chain
    const utxos = await childChain.getUtxos(srcAccount.address)
    assert.equal(utxos.length, 1)
    assert.hasAllKeys(utxos[0], ['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    assert.equal(utxos[0].amount.toString(), TRANSFER_AMOUNT)
    assert.equal(utxos[0].currency, ETH_CURRENCY)

    console.log(`Got utxo ${JSON.stringify(utxos[0])}`)

    // Convert it to a Number from BigNumber
    utxos[0].amount = Number(utxos[0].amount)
    const txBody = {
      inputs: [utxos[0]],
      outputs: [{
        owner: destAccount.address,
        amount: Number(TRANSFER_AMOUNT)
      }]
    }

    console.log(`Spending utxo ${JSON.stringify(utxos[0])}`)

    // Create the unsigned transaction
    const unsignedTx = await childChain.createTransaction(txBody)
    // Sign it
    const signatures = await childChain.signTransaction(unsignedTx, [srcAccount.privateKey])
    assert.equal(signatures.length, 2)
    // Build the signed transaction
    const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
    // Submit the signed transaction to the childchain
    const result = await childChain.submitTransaction(signedTx)
    console.log(`Submitted transaction: ${JSON.stringify(result)}`)

    // destAccount balance should be TEST_AMOUNT
    balance = await helper.waitForBalance(childChain, destAccount.address, TRANSFER_AMOUNT)
    assert.equal(balance.length, 1)
    assert.equal(balance[0].amount.toString(), TRANSFER_AMOUNT)
    console.log(`Transferred ${TRANSFER_AMOUNT} from source account ${srcAccount.address} to dest account ${destAccount.address}`)

    // srcAccount balance should be zero
    balance = await childChain.getBalance(srcAccount.address)
    assert.equal(balance.length, 0)

    // destAccount wants to exit
    const destUtxos = await childChain.getUtxos(destAccount.address)
    assert.equal(destUtxos.length, 1)
    assert.equal(destUtxos[0].amount.toString(), TRANSFER_AMOUNT)

    // We're exiting with the last (and only) utxo of destAccount
    const utxoToExit = destUtxos[0]
    const exitData = await childChain.getExitData(utxoToExit)

    let receipt = await rootChain.startExit(
      destAccount.address,
      exitData.utxo_pos.toString(),
      exitData.txbytes,
      exitData.proof,
      exitData.sigs,
      destAccount.privateKey
    )
    console.log(`Destination account called RootChain.startExit(): txhash = ${receipt.transactionHash}`)

    // Wait for challenge period
    console.log('Waiting for challenge period...')
    await helper.sleep(20 * 1000)

    // Call finalize exits.
    receipt = await rootChain.finalizeExits(destAccount.address, ETH_CURRENCY, destAccount.privateKey)
    console.log(`Destination account called RootChain.finalizeExits(): txhash = ${receipt.transactionHash}`)

    // Get ETH balance of destAccount
    const destEthBalance = await web3.eth.getBalance(destAccount.address)
    // Expect dest account's balance to be above INTIIAL_DEST_AMOUNT + TRANSFER_AMOUNT - (gas)
    const expected = web3.utils.toBN(INTIIAL_DEST_AMOUNT).add(web3.utils.toBN(TRANSFER_AMOUNT)).sub(web3.utils.toBN(100000000))
    assert.isAbove(Number(destEthBalance), Number(expected.toString()))
  })
})
