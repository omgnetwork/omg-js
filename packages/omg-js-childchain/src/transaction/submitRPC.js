// submit tx on JSON
const fetch = require('node-fetch')
const debug = require('debug')('omg.childchain.submitTx')

async function submitTx (tx, url) {
  let payload = {
    'params': {
      'transaction': tx
    },
    'method': 'submit',
    'jsonrpc': '2.0',
    'id': 0
  }

  let resp = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(payload)
  })
  let response = resp.json()
  debug(`rpc response is ${response}`)
  return response
}

module.exports = submitTx
