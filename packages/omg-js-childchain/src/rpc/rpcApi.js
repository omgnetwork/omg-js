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

const request = require('request')
const debug = require('debug')('omg.childchain.rpc')
const JSONBigNumber = require('json-bigint')

class RpcError extends Error {
  constructor ({ code, description }) {
    super(description || code)
    this.code = code
  }
}

async function get ({ url, proxyUrl }) {
  let fetch = request
  if (proxyUrl) {
    fetch = request.defaults({ proxy: proxyUrl })
  }

  try {
    const res = await fetch.get(url)
    return parseResponse(res)
  } catch (err) {
    throw new Error(err)
  }
}

async function post ({ url, body, proxyUrl }) {
  body.jsonrpc = body.jsonrpc || '2.0'
  body.id = body.id || 0

  let fetch = request
  if (proxyUrl) {
    fetch = request.defaults({ proxy: proxyUrl })
  }

  try {
    const options = {
      method: 'POST',
      uri: url,
      headers: { 'Content-Type': 'application/json' },
      body,
      json: true
    }
    const res = await fetch.post(options)
    return parseResponse(res)
  } catch (err) {
    throw new Error(err)
  }
}

async function parseResponse (res) {
  const body = JSON.stringify(res)
  let json
  try {
    // Need to use a JSON parser capable of handling uint256
    json = JSONBigNumber.parse(body)
  } catch (err) {
    throw new Error(err.message)
  }
  debug(`rpc response is ${JSON.stringify(json)}`)

  if (json.success) {
    return json.data
  }

  // TODO: THROWS HERE WITH REQUEST DATA NOT RESPONSE
  console.log('json: ', json)
  throw new RpcError(json.data)
}

module.exports = {
  get,
  post,
  parseResponse
}
