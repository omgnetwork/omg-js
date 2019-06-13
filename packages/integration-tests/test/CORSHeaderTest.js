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

const config = require('../test-config')
const fetch = require('node-fetch')
const chai = require('chai')
const assert = chai.assert

describe('CORS Header tests (ci-enabled-fast)', async () => {
  describe('Watcher CORS Header test', async () => {
    it('should return CORS headers', async () => {
      const url = `${config.watcher_url}/status.get`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 0
        })
      })
      assert.equal(response.headers.get('access-control-allow-origin'), '*')
      assert.isNotNull(response.headers.get('access-control-expose-headers'))
      assert.isNotNull(response.headers.get('access-control-allow-credentials'))
    })
  })

  describe('Child chain CORS Header test', async () => {
    it('should return CORS headers', async () => {
      const url = `${config.childchain_url}/block.get`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 0,
          hash: '0x0017372421f9a92bedb7163310918e623557ab5310befc14e67212b660c33bec'
        })
      })
      assert.equal(response.headers.get('access-control-allow-origin'), '*')
      assert.isNotNull(response.headers.get('access-control-expose-headers'))
      assert.isNotNull(response.headers.get('access-control-allow-credentials'))
    })
  })
})
