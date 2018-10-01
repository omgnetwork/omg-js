const RootChain = require('omg-js-rootchain')
const ChildChain = require('omg-js-childchain')

class Omg {
  constructor (watcherUrl, childChainUrl, web3Provider) {
    this.childChain = new ChildChain(watcherUrl, childChainUrl)
    this.rootChain = new RootChain(web3Provider)
  }
}

module.exports = Omg
