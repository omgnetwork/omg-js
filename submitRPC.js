//submit tx on JSON

const fetch = require('node-fetch');

let submitTx = async (tx) => {

    let payload = {
        "params":{
          "transaction": tx
        },
        "method":"submit",
        "jsonrpc":"2.0",
        "id":0
    }

    try {
        let resp = await fetch('http://localhost:9656', { 
            method: 'POST',
            body: JSON.stringify(payload)
        })

        let data = await resp.json()
        return data;
        console.log(data)

    } catch(error) {
        console.log(error)
    }
}

module.exports = submitTx   


