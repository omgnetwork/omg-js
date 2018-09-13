const getUtxo = require('../transaction/getUtxo')

let watcherUrl = "http://localhost:4000"
let address = "0xc8ce77d46855593f3ec40ffe235d15a29443eede"

getUtxo(watcherUrl, address)