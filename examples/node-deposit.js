// example node app to run OMG.JS Library
// You must have a Geth running with the specified account unlocked
// dont forget to retrieve the plasma addr before running

const RootChain = require('../packages/omg-js-rootchain')
const debug = require('debug')('omg.examples')

const rootChain = new RootChain('http://localhost:8545')

async function depositAndGetBlock () {
  const amount = '2'
  const alice = '0x3b9d59efb13029ad2873ab500c689d20707f76bc'
  const plasmaContractAddress = '0x49a3565c825fb94371b14a5172c48b041b263668'

  const txhash = await rootChain.depositEth(amount, alice, plasmaContractAddress)
  debug(`Deposited ${amount} eth into plasma contract, txhash = ${txhash}`)
  const blockNumber = await rootChain.getDepositBlock(txhash)
  debug(`blockNumber = ${blockNumber}`)
}

depositAndGetBlock()
