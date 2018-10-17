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

//bare minimum example for sending a transaction 
//alice address

let aliceAddress = "0xcb47205fda71789527f3dfbd0fa68d0e58e065d3"
let alicePrivateKey = "0xc7108da289bb1911f3ee93470003087bf28c5cdef0e94ae4dad69528c850fac7"
let bobAddress = "0xbe465c63320ec0646e0fdf3c52a1a9fba4ed3a06"
let amount = 2
const ChildChain = require('../packages/omg-js-childchain')

const childChain = new ChildChain(
  `http://localhost:8545`,
  `http://localhost:9656`
)

async function sendTx() {
  const utxos = await childChain.getUtxos(aliceAddress)
  const transactionSent = await childChain.sendTransaction(utxos[0], alicePrivateKey, bobAddress, amount)
}

sendTx()