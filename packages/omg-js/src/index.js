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

const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')

/**
  *Interact with Tesuji Plasma Childchain & Rootchain from JavaScript (Node.js and Browser)
  *
  *@param {string} watcherUrl contains the url of the watcher server
  *@param {string} childChainUrl contains the url of the childchain server to communicate with
  *@param {string} web3Provider contains the url of the geth node/ web3 provider
  *@return {object} Omg (Omg.childchain and Omg.rootChain)
  */

class Omg {
  constructor (watcherUrl, childChainUrl, web3Provider) {
    this.childChain = new ChildChain(watcherUrl, childChainUrl)
    this.rootChain = new RootChain(web3Provider)
  }
}

module.exports = Omg
