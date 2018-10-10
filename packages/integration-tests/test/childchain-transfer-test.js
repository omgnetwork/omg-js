const config = require('../test-config')
const helper = require('./helper')
const Web3 = require('web3')
const ChildChain = require('@omisego/omg-js-childchain')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(`http://${config.geth.host}:${config.geth.port}`)
const childChain = new ChildChain(
  `http://${config.watcher.host}:${config.watcher.port}`,
  `http://${config.childchain.host}:${config.childchain.port}`
)

const PLASMA_CONTRACT_ADDRESS = config.plasmaContract

describe('Childchain transfer tests', async () => {
  let srcAccount
  let destAccount

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    // Create and fund src account
    srcAccount = await helper.createAndFundAccount(web3, accounts[0], '', web3.utils.toWei('2', 'ether'))
    console.log(`Created src account ${JSON.stringify(srcAccount)}`)
    // Create dest account
    destAccount = helper.createAccount(web3)
    console.log(`Created dest account ${JSON.stringify(destAccount)}`)
  })

  it('should deposit funds to the Plasma contract, then transfer on the childchain', async () => {
    // Deposit ETH into the Plasma contract
    const TEST_AMOUNT = web3.utils.toWei('1', 'ether')
    try {
      const signedTx = await web3.eth.accounts.signTransaction({
        from: srcAccount.address,
        to: PLASMA_CONTRACT_ADDRESS,
        value: TEST_AMOUNT,
        gas: 2000000,
        data: '0xd0e30db0'
      }, srcAccount.privateKey)

      await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    } catch (err) {
      console.error(err)
      throw err
    }

    // Wait for transaction to be mined
    let balance = await helper.waitForBalance(childChain, srcAccount.address, TEST_AMOUNT)
    // Check src account balance is correct
    assert.equal(balance.length, 1)
    assert.equal(balance[0].amount.toString(), TEST_AMOUNT)

    // Check utxos on the child chain
    const utxos = await childChain.getUtxos(srcAccount.address)
    assert.equal(utxos.length, 1)
    assert.hasAllKeys(utxos[0], ['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    assert.equal(utxos[0].amount.toString(), TEST_AMOUNT)
    assert.equal(utxos[0].currency, '0000000000000000000000000000000000000000')

    // Convert it to a Number from BigNumber
    utxos[0].amount = Number(utxos[0].amount)
    const txBody = {
      inputs: [utxos[0]],
      outputs: [{
        owner: destAccount.address,
        amount: Number(TEST_AMOUNT)
      }]
    }

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
    balance = await helper.waitForBalance(childChain, destAccount.address, TEST_AMOUNT)
    assert.equal(balance.length, 1)
    assert.equal(balance[0].amount.toString(), TEST_AMOUNT)

    // srcAccount balance should be zero
    balance = await childChain.getBalance(srcAccount.address)
    assert.equal(balance.length, 0)
  })
})
