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

const fetch = require('node-fetch')
const JSONBigNumber = require('json-bigint')

class WatcherError extends Error {
  constructor ({ code, description }) {
    super(description)
    this.code = code
  }
}

async function get (url) {
  const resp = await fetch(url)
  return rpcResponse(resp)
}

async function post (url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return rpcResponse(resp)
}

async function rpcResponse (resp) {
  const body = await resp.text()
  let json
  try {
    // Need to use a JSON parser capable of handling uint256
    json = JSONBigNumber.parse(body)
  } catch (err) {
    throw new WatcherError('Unknown server error')
  }
  if (json.result === 'error') {
    throw new WatcherError(json.data)
  }
  return json.data
}

module.exports = {
  get,
  post
}
