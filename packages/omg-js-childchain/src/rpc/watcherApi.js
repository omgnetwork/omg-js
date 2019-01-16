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

class WatcherError extends Error {
  constructor ({ code, description }) {
    super(description)
    this.code = code
  }
}

async function get (url) {
  return rpcApi.get(url).then(handleResponse)
}

async function post (url, body) {
  return rpcApi.post(url, body, { 'Content-Type': 'application/json' }).then(handleResponse)
}

function handleResponse (response) {
  if (response.result === 'error') {
    throw new WatcherError(response.data)
  }
  return response.data
}

module.exports = {
  get,
  post
}
