// example node app to run OMG.JS Library
// You must have a Geth running with the specified account unlocked
// dont forget to retrieve the plasma addr before running

const RootChain = require('../packages/omg-js-rootchain')
const debug = require('debug')('omg.examples')

const rootChain = new RootChain('http://localhost:8545')

async function depositAndGetBlock () {
  const amount = '2'
  const alice = '0x512c66a21ed773dd1af5b0b4969bd183cbbbe2dd'
  const plasmaContractAddress = '0xc93d606c071b23fd8015a77ce438dd0c1069e0da'

  const txhash = await rootChain.depositEth(amount, alice, plasmaContractAddress)
  debug(`Deposited ${amount} eth into plasma contract, txhash = ${txhash}`)
  const blockNumber = await rootChain.getDepositBlock(txhash)
  debug(`blockNumber = ${blockNumber}`)
}

depositAndGetBlock()
