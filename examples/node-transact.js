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

// bare minimum example for sending a transaction

const ChildChain = require('../packages/omg-js-childchain')

const aliceAddress = '0xcb47205fda71789527f3dfbd0fa68d0e58e065d3'
const alicePrivateKey = ''
const bobAddress = '0xbe465c63320ec0646e0fdf3c52a1a9fba4ed3a06'

const childChain = new ChildChain(
  `http://localhost:8545`,
  `http://localhost:9656`
)

async function sendTx () {
  try {
    const amount = 2
    const utxos = await childChain.getUtxos(aliceAddress)

    const tx = await childChain.sendTransaction(
      aliceAddress,
      [utxos[0]],
      [alicePrivateKey],
      bobAddress,
      amount
    )
    console.log(tx)
  } catch (err) {
    console.error(err)
  }
}

sendTx()
