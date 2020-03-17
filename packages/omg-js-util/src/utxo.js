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
  limitations under the License.
*/
const { uniqBy, sumBy } = require('lodash')

function mergeUtxosToOutput (utxos) {
  if (utxos.length > 4) {
    throw new Error('max utxos that can merge must less than 4')
  }
  const isSameCurrency = uniqBy(utxos, u => u.currency).length === 1
  if (!isSameCurrency) {
    throw new Error('all utxo currency must be the same')
  }

  return {
    outputType: 1,
    outputGuard: utxos.owner,
    currency: utxos[0].currency,
    amount: sumBy(utxos, d => d.amount)
  }
}

module.exports = {
  mergeUtxosToOutput
}
