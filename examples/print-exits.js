/*
  Copyright 2019 OmiseGO Pte Ltd

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const Web3 = require('web3')
const RootChain = require('../packages/omg-js-rootchain/src/rootchain')
const getFlags = require('./parse-args')
const config = require('./config.js')

const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node), null, { transactionConfirmationBlocks: 1 })
const rootChain = new RootChain({ web3, plasmaContractAddress: config.plasmaframework_contract_address })

async function printExits () {
  try {
    const { owner } = getFlags('owner')
    const address = config[`${owner}_eth_address`]

    const exits = await rootChain.getExits(address)
    console.log(JSON.stringify(exits, null, 2))
  } catch (error) {
    console.log('Error: ', error.message)
  }
}

printExits()
