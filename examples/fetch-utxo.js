const ChildChain = require('../packages/omg-js-childchain')

let watcherUrl = 'http://localhost:4000'
let address = '0xc8ce77d46855593f3ec40ffe235d15a29443eede'

const childChain = new ChildChain(watcherUrl)
childChain.getUtxo(watcherUrl, address).then(console.log)
