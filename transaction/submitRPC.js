// submit tx on JSON

const fetch = require('node-fetch')

let submitTx = async (tx, url) => {
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
  return resp.json()
}

module.exports = submitTx
