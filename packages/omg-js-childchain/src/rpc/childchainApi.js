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

const rpcApi = require('./rpcApi')

class ChildChainError extends Error {
  constructor ({ code, message, data }) {
    super(`${message}: ${data}`)
    this.code = code
  }
}

async function get (url) {
  return rpcApi.get(url).then(handleResponse)
}

async function post (url, body) {
  body.jsonrpc = body.jsonrpc || '2.0'
  body.id = body.id || 0
  return rpcApi.post(url, body).then(handleResponse)
}

function handleResponse (response) {
  if (response.error) {
    throw new ChildChainError(response.error)
  }
  return response.result
}

module.exports = {
  get,
  post
}
