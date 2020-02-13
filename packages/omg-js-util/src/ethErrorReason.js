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

const hexPrefix = require('./hexPrefix')
const { ethErrorReasonSchema } = require('./validators')
const Joi = require('@hapi/joi')

/**
 * Retrieve EVM revert reason from the transaction hash
 *
 * @method ethErrorReason
 * @param {Object} args an arguments object
 * @param {Web3} args.web3 web3 instance
 * @param {string} args.hash transaction hash
 * @return {Promise<string>} promise that resolves with the error reason
 */
async function ethErrorReason ({ web3, hash }) {
  Joi.assert({ web3, hash }, ethErrorReasonSchema)
  const tx = await web3.eth.getTransaction(hash)
  if (!tx) {
    console.log('Tx not found, cannot get reason')
  } else {
    const code = await web3.eth.call(tx, tx.blockNumber)
    if (code && code.substr(138)) {
      const reason = web3.utils.toAscii(hexPrefix(code.substr(138)))
      console.log('Revert reason:', reason)
      return reason
    } else {
      console.log('No return value from tx, cannot get reason')
    }
  }
}

module.exports = ethErrorReason
