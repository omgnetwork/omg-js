export const CURRENCY_MAP = {
  ETH: '0x0000000000000000000000000000000000000000',
  OMG: {
    MAINNET: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07'
  }
};

export const NULL_METADATA = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

export const MAX_INPUTS = 4;
export const MAX_OUTPUTS = 4;

export const BLOCK_OFFSET = 1000000000;
export const TX_OFFSET = 10000;

export const NULL_INPUT = {
  blknum: 0,
  txindex: 0,
  oindex: 0
};
export const NULL_OUTPUT = {
  outputType: 0,
  outputGuard: NULL_ADDRESS,
  currency: NULL_ADDRESS,
  amount: 0
};

export const ETH_VAULT_ID = 1;
export const ERC20_VAULT_ID = 2;
export const EXIT_GAME_PAYMENT_TYPE = 1;
