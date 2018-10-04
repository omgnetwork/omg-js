const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')

class Omg {
  /**
  *Summary: Interact with Tesuji Plasma Childchain & Rootchain from JavaScript (Node.js and Browser)
  *Description: allows user to interact with Tesuji Plasma from JavaScript. 
  *
  *@param {string} watcherUrl contains the url of the watcher server
  *@param {string} childChainUrl contains the url of the childchain server to communicate with
  *@param {string} web3Provider contains the url of the geth node/ web3 provider
  *
  */
  constructor (watcherUrl, childChainUrl, web3Provider) {
    this.childChain = new ChildChain(watcherUrl, childChainUrl)
    this.rootChain = new RootChain(web3Provider)
  }
}

module.exports = Omg
