/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const ax = require('axios')
const ChildChain = require('../src/childchain')
const sinon = require('sinon')
const { transaction } = require('@omisego/omg-js-util')

const watcherUrl = 'http://omg-watcher'
const plasmaContractAddress = '0xE009136B58a8B2eEb80cfa18aD2Ea6D389d3A375'

describe('createTransaction', function () {
  before(function () {
    sinon.stub(ax, 'request').resolves({
      status: 200,
      data: JSON.stringify({
        success: true,
        data: 'foobar'
      })
    })
  })

  after(function () {
    ax.request.restore()
  })

  it('should convert string amount in payments to BN amount', async function () {
    const stringAmount = '1000000'
    const params = {
      owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
      payments: [
        {
          owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
          currency: transaction.ETH_CURRENCY,
          amount: stringAmount
        }
      ],
      fee: {
        currency: '00000000000000000000'
      },
      metadata: transaction.NULL_METADATA
    }

    const childChain = new ChildChain({ watcherUrl, plasmaContractAddress })
    await childChain.createTransaction(params)

    const expectedCall = {
      method: 'POST',
      url: 'http://omg-watcher/transaction.create',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
        payments: [
          {
            owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
            currency: transaction.ETH_CURRENCY,
            amount: Number(stringAmount)
          }
        ],
        fee: {
          currency: '00000000000000000000'
        },
        metadata: transaction.NULL_METADATA,
        jsonrpc: '2.0',
        id: 0
      })
    }

    sinon.assert.calledWith(ax.request, sinon.match(expectedCall))
  })
})
