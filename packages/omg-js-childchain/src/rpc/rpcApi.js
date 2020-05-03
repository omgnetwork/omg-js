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

const axios = require('axios')
const debug = require('debug')('omg.childchain.rpc')
const JSONBigNumber = require('omg-json-bigint')
const HttpsProxyAgent = require('https-proxy-agent')
class RpcError extends Error {
  constructor ({ code, description, messages }) {
    super(description || code + (messages ? `, ${messages.code}` : ''))
    this.code = code
  }
}
// function to override default behavior of axios, so it doesn't use native JSON.parse
function getTransformResponse () {
  return [(data) => data]
}

function getHttpsProxyAgent (proxyUrl) {
  return proxyUrl ? new HttpsProxyAgent({ host: proxyUrl, rejectUnauthorized: false }) : undefined
}

async function get ({ url, proxyUrl }) {
  try {
    const options = {
      method: 'GET',
      url: url,
      transformResponse: getTransformResponse(),
      httpsAgent: getHttpsProxyAgent(proxyUrl)
    }

    const res = await axios.request(options)
    return parseResponse(res)
  } catch (err) {
    throw new Error(err)
  }
}

async function post ({ url, body, proxyUrl }) {
  body.jsonrpc = body.jsonrpc || '2.0'
  body.id = body.id || 0
  try {
    const options = {
      method: 'POST',
      url: url,
      headers: { 'Content-Type': 'application/json' },
      data: JSONBigNumber.stringify(body),
      transformResponse: getTransformResponse(),
      httpsAgent: getHttpsProxyAgent(proxyUrl)
    }
    const res = await axios.request(options)
    return parseResponse(res)
  } catch (err) {
    throw new Error(err)
  }
}

async function parseResponse (res) {
  let data
  try {
    // Need to use a JSON parser capable of handling uint256
    data = JSONBigNumber.parse(res.data)
  } catch (err) {
    throw new Error(`Unable to parse response from server: ${err}`)
  }
  debug(`rpc response is ${JSON.stringify(data)}`)

  if (data.success) {
    return data.data
  }

  throw new RpcError(data.data)
}

module.exports = {
  get,
  post,
  parseResponse
}
