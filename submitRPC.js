//submit tx on JSON

const fetch = require('node-fetch');

let submitTx = async (tx, url) => {

    let payload = {
        "params":{
          "transaction": tx
        },
        "method":"submit",
        "jsonrpc":"2.0",
        "id":0
    }

    try {
        let resp = await fetch(url, { 
            method: 'POST',
            body: JSON.stringify(payload)
        })
        let resp1 = await resp.json()
        let resp2 = await console.log(resp1)


    } catch(error) {
        console.log(error)
    }
}

module.exports = submitTx   


