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

const rootChain = new RootChain('http://localhost:8545')

async function deposit () {
  const amount = '2'
  const alice = '0x512c66a21ed773dd1af5b0b4969bd183cbbbe2dd'
  const plasmaContractAddress = '0xc93d606c071b23fd8015a77ce438dd0c1069e0da'

  const txhash = await rootChain.depositEth(amount, alice, plasmaContractAddress)
  console.log(`Deposited ${amount} eth into plasma contract, txhash = ${txhash}`)
}

deposit()
