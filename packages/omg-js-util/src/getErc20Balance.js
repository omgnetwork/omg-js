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

const erc20abi = require('human-standard-token-abi')
const { getErc20BalanceSchema } = require('./validators')
const Joi = require('@hapi/joi')

/**
 * Retrieve the RootChain ERC20 balance for an address
 *
 * @method getErc20Balance
 * @param {Object} args arguments object
 * @param {Web3} args.web3 web3 instance
 * @param {string} args.address the address to check
 * @param {string} args.erc20Address the address of the erc20 contract
 * @return {Promise<string>} promise that resolves with the balance
 */
async function getErc20Balance ({ web3, address, erc20Address }) {
  Joi.assert({ web3, address, erc20Address }, getErc20BalanceSchema)
  const erc20Contract = new web3.eth.Contract(erc20abi, erc20Address)
  const txDetails = {
    from: address,
    to: erc20Address,
    data: erc20Contract.methods.balanceOf(address).encodeABI()
  }
  const balance = await web3.eth.call(txDetails)
  // return number as string in case of very large numbers
  return web3.utils.hexToNumberString(balance)
}

module.exports = getErc20Balance
