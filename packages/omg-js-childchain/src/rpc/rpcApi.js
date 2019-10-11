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

const rp = require('request-promise')
const debug = require('debug')('omg.childchain.rpc')
const JSONBigNumber = require('json-bigint')

class RpcError extends Error {
  constructor ({ code, description }) {
    super(description || code)
    this.code = code
  }
}

async function get ({ url, proxyUrl }) {
  let fetch = rp
  if (proxyUrl) {
    fetch = rp.defaults({ proxy: proxyUrl })
  }

  try {
    const res = await fetch.get(url)
    return parseResponse(res)
  } catch (err) {
    throw new RpcError(err)
  }
}

async function post ({ url, body, proxyUrl }) {
  body.jsonrpc = body.jsonrpc || '2.0'
  body.id = body.id || 0

  let fetch = rp
  if (proxyUrl) {
    fetch = rp.defaults({ proxy: proxyUrl })
  }

  try {
    const options = {
      method: 'POST',
      uri: url,
      headers: { 'Content-Type': 'application/json' },
      body,
      json: true
    }
    const res = await fetch(options)
    return parseResponse(res)
  } catch (err) {
    throw new RpcError(err)
  }
}

async function parseResponse (resp) {
  const body = await resp.text()
  let json
  try {
    // Need to use a JSON parser capable of handling uint256
    json = JSONBigNumber.parse(body)
  } catch (err) {
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
