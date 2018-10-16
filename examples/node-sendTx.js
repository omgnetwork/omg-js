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
// IMPORTANT: Do not store Privatekey as strings in production apps

const ChildChain = require('../packages/omg-js-childchain')

const watcherUrl = 'http://localhost:4000'
const childChainUrl = 'http://localhost:9656'

const childChain = new ChildChain(watcherUrl, childChainUrl)

let input1 = { blknum1: 1404001, txindex1: 0, oindex1: 0 }
let input2 = { blknum2: 0, txindex2: 0, oindex2: 0 }
let curr = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
let owner = [
  { newowner1: '0x2eac736d6f0d71d3e51345417a5b205bfa4748a8', amount1: 3 },
  { newowner2: '0x542740fabe3222a5a4e3c8521f63ab74ac6c77d9', amount2: 2 }
]
let alicePriv = '0xe6dfd35b7c5b4f2e69b57756c926a89b185c5e7e0551a604c890e6a840192ae4'

childChain.sendTransaction([input1, input2], curr, owner, alicePriv)
