//get UTXO from watcher
const fetch = require('node-fetch')

const getUtxo = async (watcherUrl, address) => {
  let resp = await fetch(`${watcherUrl}/account/utxo?address=${address}`)
  return resp.json()
}

module.exports = getUtxo
