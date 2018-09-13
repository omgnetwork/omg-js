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

  try {
    let resp = await fetch(childchainUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    let data = await resp.json()
    return data
    console.log(data)

  } catch (error) {
    console.log(error)
  }
}

module.exports = getBlock;


