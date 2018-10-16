/* 
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

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
  let response = await resp.json()
  debug(`rpc response is ${JSON.stringify(response)}`)
  if (response.error) {
    throw new Error(response.error.message)
  }
  return response.result
}

module.exports = submitTx
