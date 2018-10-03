// get UTXO from watcher
const fetch = require('node-fetch')
const debug = require('debug')('omg.childchain.getUtxo')

async function getUtxo (watcherUrl, address) {
  let resp = await fetch(`${watcherUrl}/account/utxo?address=${address}`)
  let utxos = await resp.json()
  debug(`utxo is: ${utxos}`)
  return utxos
}

module.exports = getUtxo
