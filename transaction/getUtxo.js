//get UTXO from watcher
const fetch = require('node-fetch')

const getUtxo = async (watcherUrl, address) => {
    try {
        let resp = await fetch(`${watcherUrl}/account/utxo?address=${address}`)
        let resp1 = await resp.json()
        console.log(resp1)
        return resp1
    } catch (err){
        console.log(err)
    }
}

module.exports = getUtxo
