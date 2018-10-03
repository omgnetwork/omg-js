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
const TEST_PASSWORD = '123456'

describe('integration tests', async () => {
  let account

  before(async () => {
    // Create and fund a new account
    const accounts = await web3.eth.getAccounts()
    account = await helper.createAndFundAccount(web3, TEST_PASSWORD, accounts[0], '', web3.utils.toWei('2', 'ether'))
    console.log(`Created new account ${account}`)
  })

  it.only('should deposit ETH to the Plasma contract', async () => {
    // The new account should have no initial balance
    const initialBalance = await childChain.getBalance(account)
    assert.equal(initialBalance.length, 0)

    // Deposit ETH into the Plasma contract
    await web3.eth.personal.unlockAccount(account, TEST_PASSWORD)
    const txhash = await rootChain.depositEth(1, account, config.plasmaContract)
    console.log(`Deposit tx hash: ${txhash}`)

    // Wait for transaction to be mined and reflected in the account's balance
    const balance = await promiseRetry(async (retry, number) => {
      console.log(`Waiting for balance... ${number}`)
      const resp = await childChain.getBalance(account)
      if (resp.length === 0 || resp[0].amount === 0) {
        retry()
      }
      return resp
    })

    console.log(`Balance: ${balance}`)

    // Check balance is correct
    assert.equal(balance[0].currency, '0000000000000000000000000000000000000000')
    assert.equal(balance[0].amount.toString(), web3.utils.toWei('1', 'ether'))

    // THe account should have one utxo on the child chain
    const utxos = await childChain.getUtxos(account)
    assert.equal(utxos.length, 1)
    assert.hasAllKeys(utxos[0], ['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    assert.equal(utxos[0].amount.toString(), web3.utils.toWei('1', 'ether'))
    assert.equal(utxos[0].currency, '0000000000000000000000000000000000000000')
  })
})
