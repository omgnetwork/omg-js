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

/** @internal */
export const CURRENCY_MAP = {
  ETH: '0x0000000000000000000000000000000000000000',
  OMG: {
    MAINNET: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07'
  }
};

/** @internal */
export const NULL_METADATA = '0x0000000000000000000000000000000000000000000000000000000000000000';

/** @internal */
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

/** @internal */
export const MAX_INPUTS = 4;

/** @internal */
export const MAX_OUTPUTS = 4;

/** @internal */
export const BLOCK_OFFSET = 1000000000;

/** @internal */
export const TX_OFFSET = 10000;

/** @internal */
export const NULL_INPUT = {
  blknum: 0,
  txindex: 0,
  oindex: 0
};

/** @internal */
export const NULL_OUTPUT = {
  outputType: 0,
  outputGuard: NULL_ADDRESS,
  currency: NULL_ADDRESS,
  amount: 0
};

/** @internal */
export const ETH_VAULT_ID = 1;

/** @internal */
export const ERC20_VAULT_ID = 2;

/** @internal */
export const EXIT_GAME_PAYMENT_TYPE = 1;
