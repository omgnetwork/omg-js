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

const { hexToBytesSchema } = require('./validators')
const Joi = require('@hapi/joi')

/**
 * Helper to transform hex to bytes
 *
 * @method hexToBytes
 * @param {string} hex hex string to transform
 * @return {string} transformed value as bytes
 */
function hexToBytes (hex) {
  Joi.assert({ hex }, hexToBytesSchema)
  hex = hex.toString(16)
  hex = hex.replace(/^0x/i, '')
  hex = hex.length % 2 ? '0' + hex : hex

  const bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }

  return bytes
};

module.exports = hexToBytes
