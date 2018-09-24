//Get_block on JSON RPC

const fetch = require('node-fetch');

let getBlock = async (blockhash, childchainUrl) => {

  let payload = {
    "params": {
      "hash": blockhash
    },
    "method": "get_block",
    "jsonrpc": "2.0",
    "id": 0
  }

  let resp = await fetch(childchainUrl, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return resp.json()
}

module.exports = getBlock;
