const config = require('../test-config')
const helper = require('./helper')
const Web3 = require('web3')
const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')
const promiseRetry = require('promise-retry')
const chai = require('chai')
const assert = chai.assert

const web3 = new Web3(`http://${config.geth.host}:${config.geth.port}`)
const rootChain = new RootChain(`http://${config.geth.host}:${config.geth.port}`)
const childChain = new ChildChain(`http://${config.watcher.host}:${config.watcher.port}`)
const PLASMA_CONTRACT_ADDRESS = config.plasmaContract

describe('integration tests', async () => {
  let account

  before(async () => {
    // Create and fund a new account
    const accounts = await web3.eth.getAccounts()
    // Assume the funding account is accounts[0] and has a blank password
    account = await helper.createAndFundAccount(web3, accounts[0], '', web3.utils.toWei('2', 'ether'))
    console.log(`Created new account ${account}`)
  })

  it('should deposit ETH to the Plasma contract', async () => {
    // The new account should have no initial balance
    const initialBalance = await childChain.getBalance(account.address)
    assert.equal(initialBalance.length, 0)

    // Deposit ETH into the Plasma contract
    const TEST_AMOUNT = web3.utils.toWei('1', 'ether')
    try {
      const signedTx = await web3.eth.accounts.signTransaction({
        from: account.address,
        to: PLASMA_CONTRACT_ADDRESS,
        value: TEST_AMOUNT,
        gas: 2000000,
        data: '0xd0e30db0'
      }, account.privateKey)

      await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
    } catch (err) {
      console.error(err)
      throw err
    }

    // Wait for transaction to be mined and reflected in the account's balance
    const balance = await helper.waitForBalance(childChain, account.address, TEST_AMOUNT)
    console.log(`Balance: ${balance}`)

    // Check balance is correct
    assert.equal(balance[0].currency, '0000000000000000000000000000000000000000')
    assert.equal(balance[0].amount.toString(), web3.utils.toWei('1', 'ether'))

    // THe account should have one utxo on the child chain
    const utxos = await childChain.getUtxos(account.address)
    assert.equal(utxos.length, 1)
    assert.hasAllKeys(utxos[0], ['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    assert.equal(utxos[0].amount.toString(), web3.utils.toWei('1', 'ether'))
    assert.equal(utxos[0].currency, '0000000000000000000000000000000000000000')
  })
})
