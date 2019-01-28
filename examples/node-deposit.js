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

// example node app to run OMG.JS Library
// You must have a Geth running with the specified account unlocked
// dont forget to retrieve the plasma addr before running

const RootChain = require('../packages/omg-js-rootchain')
const { transaction } = require('../packages/omg-js-util')

const plasmaContractAddress = '0xc93d606c071b23fd8015a77ce438dd0c1069e0da'
const rootChain = new RootChain('http://localhost:8545', plasmaContractAddress)

async function deposit () {
  const amount = '2'
  const address = '0xcb47205fda71789527f3dfbd0fa68d0e58e065d3'
  const privateKey = '0xc7108da289bb1911f3ee93470003087bf28c5cdef0e94ae4dad69528c850fac7 key'

  // Create the deposit transaction
  const depositTx = transaction.encodeDepositTx(address, amount, transaction.NULL_ADDRESS)

  // Deposit ETH into the Plasma contract
  const txhash = await rootChain.depositEth(
    depositTx,
    amount,
    { from: address, privateKey: privateKey }
  )

  console.log(`Deposited ${amount} eth into plasma contract, txhash = ${txhash}`)
}

deposit()
