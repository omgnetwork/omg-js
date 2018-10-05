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
