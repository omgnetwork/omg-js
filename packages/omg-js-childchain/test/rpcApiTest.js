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

const { use, assert } = require('chai')
const chaiAsPromised = require('chai-as-promised')
const ax = require('axios')
const sinon = require('sinon')

const ChildChain = require('../src/childchain')
const rpcApi = require('../src/rpc/rpcApi')

use(chaiAsPromised)

const watcherUrl = 'http://omg-watcher'
const proxyUrl = 'http://omg-proxy'
const plasmaContractAddress = '0xE009136B58a8B2eEb80cfa18aD2Ea6D389d3A375'

describe('rpcApi test', function () {
  before(function () {
    sinon.stub(ax, 'request').resolves(
      JSON.stringify({
        success: true,
        data: 'foobar'
      })
    )
  })
  after(function () {
    ax.request.restore()
  })
  it.only('should call body post as string', async function () {
    const res = await rpcApi.post({
      url: watcherUrl,
      body: { test: 'object should call string' }
    })
    assert.equal(res, 'foobar')
    const expectedCall = {
      method: 'POST',
      url: 'http://omg-watcher',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        test: 'object should call string',
        jsonrpc: '2.0',
        id: 0
      })
    }
    sinon.assert.calledWith(ax.request, expectedCall)
  })

  it('should get to passed url', async function () {
    const res = await rpcApi.get({ url: watcherUrl })
    assert.equal(res, 'foobar')
    const expectedCall = {
      method: 'GET',
      url: 'http://omg-watcher'
    }
    sinon.assert.calledWith(ax.request, expectedCall)
  })

  it('should post to passed url', async function () {
    const res = await rpcApi.post({
      url: watcherUrl,
      data: { id: 10, foo: 'bar' }
    })
    const expectedCall = {
      method: 'POST',
      url: watcherUrl,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ id: 10, foo: 'bar', jsonrpc: '2.0' })
    }
    assert.equal(res, 'foobar')
    sinon.assert.calledWith(ax.request, expectedCall)
  })
})

describe('rpcApi integration test', function () {
  before(function () {
    sinon.stub(ax, 'post').resolves(
      JSON.stringify({
        success: true,
        data: 'foobar'
      })
    )
  })
  after(function () {
    ax.request.restore()
  })

  it('childchain should pass proxy url if it exists', async function () {
    const childchainWithProxy = new ChildChain({
      watcherUrl,
      watcherProxyUrl: proxyUrl,
      plasmaContractAddress
    })
    const res = await childchainWithProxy.getTransaction('0x123')
    const expectedCall = {
      method: 'POST',
      url: `${watcherUrl}/transaction.get`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ id: '0x123', jsonrpc: '2.0' }),
      proxy: proxyUrl,
      rejectUnauthorized: false
    }
    assert.equal(res, 'foobar')
    sinon.assert.calledWith(ax.request, expectedCall)
  })

  it('childchain should not pass proxy url if it doesnt exist', async function () {
    const childchainNoProxy = new ChildChain({ watcherUrl, plasmaContractAddress })
    const res = await childchainNoProxy.getTransaction('0xabc')
    const expectedCall = {
      method: 'POST',
      url: `${watcherUrl}/transaction.get`,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ id: '0xabc', jsonrpc: '2.0' })
    }
    assert.equal(res, 'foobar')
    sinon.assert.calledWith(ax.request, expectedCall)
  })
})
