/*
Copyright 2019 OmiseGO Pte Ltd

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
const debug = require('debug')('omg.childchain.rpc')
const JSONBigNumber = require('json-bigint')

class RpcError extends Error {
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}

async function get (url) {
  return fetch(url).then(parseResponse)
}

async function post (url, body) {
  body.jsonrpc = body.jsonrpc || '2.0'
  body.id = body.id || 0

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(parseResponse)
}

async function parseResponse (resp) {
  const body = await resp.text()
  let json
  try {
    // Need to use a JSON parser capable of handling uint256
    json = JSONBigNumber.parse(body)
  } catch (err) {
    console.warn(err)
    throw new Error('Unknown server error')
  }
  debug(`rpc response is ${JSON.stringify(json)}`)

  if (json.success) {
    return json.data
  }

  throw new RpcError(json.data)
}

module.exports = {
  get,
  post,
  parseResponse
}
