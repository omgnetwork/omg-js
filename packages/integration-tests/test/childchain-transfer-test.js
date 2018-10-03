const Web3 = require('web3')
const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')
const promiseRetry = require('promise-retry')
const chai = require('chai')
const expect = chai.expect

const GETH_URL = 'http://localhost:8545'
const WATCHER_URL = 'http://localhost:4000'
const CHILDCHAIN_URL = 'http://localhost:9656'
const web3 = new Web3(GETH_URL)
const rootChain = new RootChain(GETH_URL)
const childChain = new ChildChain(WATCHER_URL, CHILDCHAIN_URL)

const PLASMA_CONTRACT_ADDRESS = '0x45ff03d1c82c4dd62b33eb0eb9e71593055a376b'
const TEST_PASSWORD = '123456'

describe('integration tests', async () => {
  let account
  let destAccount
  let privKey

  before(async () => {
    // Create and unlock a new account
    // let acc = await web3.eth.personal.newAccount(TEST_PASSWORD)
    let acc = '0x913374150d16f685d86a8626038179297e9350f9'
    account = acc.toLowerCase()

    privKey = '5adf60dedf0edd637285e3a5609c9b83fd324716e68b212dc2834bac79309635'

    await web3.eth.personal.unlockAccount(account, TEST_PASSWORD)
    console.log(`account = ${account}`)

    acc = await web3.eth.personal.newAccount(TEST_PASSWORD)
    destAccount = acc.toLowerCase()

    await web3.eth.personal.unlockAccount(destAccount, TEST_PASSWORD)
    console.log(`destAccount = ${destAccount}`)

    // Unlock account[0]
    const accounts = await web3.eth.getAccounts()
    await web3.eth.personal.unlockAccount(accounts[0], '')

    // Fund the new account
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: account,
      value: web3.utils.toWei('2', 'ether')
    })

    // Fund the dest account
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: destAccount,
      value: web3.utils.toWei('2', 'ether')
    })
  })

  it('should deposit funds to the Plasma contract', async () => {
    const channel = childChain.subscribe(`transfer:${account}`)
    channel.onMessage = (event, payload, ref) => {
      console.log(` ***** msg: ${event}, ${JSON.stringify(payload, null, 2)}, ${ref}`)
      return payload
    }
    channel.on('address_received', msg => {
      console.log(`address_received: ${JSON.stringify(msg)}`)
    })
    channel.on('address_spent', msg => {
      console.log(`address_spent: ${JSON.stringify(msg)}`)
    })

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

    // // Check balance on the child chain
    console.log(`account 1 balance = ${JSON.stringify(balance, null, 2)}`)
    // expect(balance[0].currency).to.equal('0000000000000000000000000000000000000000')
    // expect(balance[0].amount.toString()).to.equal(web3.utils.toWei('1', 'ether'))

    // Check utxos on the child chain
    const utxos = await childChain.getUtxos(account)
    console.log(JSON.stringify(utxos, null, 2))
    expect(utxos[0]).to.include.all.keys(['txindex', 'txbytes', 'oindex', 'currency', 'blknum', 'amount'])
    // expect(utxos[0].amount.toString()).to.equal(web3.utils.toWei('1', 'ether'))
    expect(utxos[0].currency).to.equal('0000000000000000000000000000000000000000')

    let input1 = {
      blknum1: utxos[0].blknum,
      txindex1: utxos[0].txindex,
      oindex1: utxos[0].oindex
    }
    let input2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
    let curr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    let output = [
      { newowner1: account, amount1: 0 },
      { newowner2: destAccount, amount2: 1 }
    ]

    console.log('===== alice transfer 1 ETH to bob')
    let transactionSent = await childChain.sendTransaction([input1, input2], curr, output, privKey)
    return transactionSent
  })
})
