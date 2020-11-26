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

import axios from 'axios';
import sinon from 'sinon';

import * as Constants from '../../common/constants';

import { createTransaction } from '../transaction';

describe('watcher/transaction test', function () {
  describe('createTransaction test', function () {
    before(function () {
      sinon.stub(axios, 'request').resolves({
        status: 200,
        data: JSON.stringify({
          success: true,
          data: 'foobar'
        })
      });
    });
  
    after(function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (axios.request as any).restore();
    });
  
    it('should convert string amount in payments to BN amount', async function () {
      const stringAmount = '1000000';

      await createTransaction.call({
        watcherUrl: 'http://omg-watcher'
      }, {
        owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
        payments: [
          {
            owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
            currency: Constants.CURRENCY_MAP.ETH,
            amount: stringAmount
          }
        ],
        feeCurrency: '00000000000000000000',
        metadata: Constants.NULL_METADATA
      });

      const expectedCall = {
        method: 'POST',
        url: 'http://omg-watcher/transaction.create',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({
          owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
          payments: [
            {
              owner: '0xd72afdfa06ae5857a639051444f7608fea1528d4',
              currency: Constants.CURRENCY_MAP.ETH,
              amount: Number(stringAmount)
            }
          ],
          fee: {
            currency: '00000000000000000000'
          },
          metadata: Constants.NULL_METADATA,
          jsonrpc: '2.0',
          id: 0
        })
      };
  
      sinon.assert.calledWith(axios.request, sinon.match(expectedCall));
    });
  });
});
