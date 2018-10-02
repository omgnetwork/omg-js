const Web3 = require('web3')
const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')
const promiseRetry = require('promise-retry')
const chai = require('chai')
const expect = chai.expect

const GETH_URL = 'http://localhost:8545'
const WATCHER_URL = 'http://localhost:4000'
const web3 = new Web3(GETH_URL)
const rootChain = new RootChain(GETH_URL)
const childChain = new ChildChain(WATCHER_URL)

const PLASMA_CONTRACT_ADDRESS = '0x45ff03d1c82c4dd62b33eb0eb9e71593055a376b'
const TEST_PASSWORD = '123456'

describe('integration tests', async () => {
  let account

  before(async () => {
    // Create and unlock a new account
    const acc = await web3.eth.personal.newAccount(TEST_PASSWORD)
    account = acc.toLowerCase()

    await web3.eth.personal.unlockAccount(account, TEST_PASSWORD)
    console.log(account)

    // Unlock account[0]
    const accounts = await web3.eth.getAccounts()
    await web3.eth.personal.unlockAccount(accounts[0], '')

    // Fund the new account
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: account,
      value: web3.utils.toWei('2', 'ether')
    })

    const balance = await web3.eth.getBalance(account)
    console.log(`balance = ${balance}`)
    expect(balance).to.equal(web3.utils.toWei('2', 'ether'))
  })

  it('should deposit funds to the Plasma contract', async () => {
    // Deposit ETH into the Plasma contract
    const txhash = await rootChain.depositEth(1, account, PLASMA_CONTRACT_ADDRESS)
    console.log(`txhash = ${txhash}`)

    // Wait for transaction to be mined
    const balance = await promiseRetry(async (retry, number) => {
      console.log('Waiting for balance... ', number)
      const resp = await childChain.getBalance(account)
      if (resp.length === 0 || resp[0].amount === 0) {
        retry()
      }
      return resp
    })

    // Check balance on the child chain
    console.log(JSON.stringify(balance, null, 2))
    expect(balance[0].currency).to.equal('0000000000000000000000000000000000000000')
    expect(balance[0].amount.toString()).to.equal(web3.utils.toWei('1', 'ether'))

    // Check utxos on the child chain
    const utxos = await childChain.getUtxos(account)
    console.log(JSON.stringify(utxos, null, 2))
    expect(utxos[0]).to.include.all.keys(['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    expect(utxos[0].amount.toString()).to.equal(web3.utils.toWei('1', 'ether'))
    expect(utxos[0].currency).to.equal('0000000000000000000000000000000000000000')
  })
})
