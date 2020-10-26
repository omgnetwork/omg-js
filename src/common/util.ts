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

import BN from 'bn.js';

/** Prefix a hex string with 0x */
export function prefixHex (hex: string): string {
  return hex.startsWith('0x')
    ? hex
    : `0x${hex}`;
}

/** Turn a int192 into a prefixed hex string */
export function int192toHex (int192: number | string | BN): string {
  return typeof int192 === 'string'
    ? prefixHex(int192)
    : prefixHex(int192.toString(16));
}
