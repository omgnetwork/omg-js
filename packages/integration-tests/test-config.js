/*
Copyright 2018 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

require('dotenv').config()

const config = {
  geth_url: process.env.GETH_URL || 'https://rinkeby.infura.io/v3/a301a155083f4196b46670952fa3aa4e',
  watcher_url: process.env.WATCHER_URL || 'http://audit-ea36f5f-watcher.omg.network/',
  childchain_url: process.env.CHILDCHAIN_URL || 'http://audit-ea36f5f-childchain.omg.network/',
  rootchainContract: process.env.ROOTCHAIN_CONTRACT || '0x979f7c2be6db0a0ef19995294670fc292aba2f5b',
  contract_exchanger_url: process.env.CONTRACT_EXCHANGER_URL || 'http://localhost:5000/get_contract',
  testErc20Contract: process.env.TEST_ERC20_CONTRACT || '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  fundAccount: process.env.FUND_ACCOUNT || '0xDda6fD1D4cDd22439c06de86145c448430249F70',
  fundAccountPrivateKey: process.env.FUND_ACCOUNT_PRIVATEKEY || '0x85B36F4A027581038BB5014E22CBF097DD13B665522C5B16E13DB94D01EC9C51',
  fundAccountPassword: process.env.FUND_ACCOUNT_PASSWORD || '',
  testFaucetAddress: process.env.TEST_FAUCET_ADDRESS || '0xDda6fD1D4cDd22439c06de86145c448430249F70',
  testFaucetPrivateKey: process.env.TEST_FAUCET_PRIVATEKEY || '0x85B36F4A027581038BB5014E22CBF097DD13B665522C5B16E13DB94D01EC9C51',
  minAmountEth: process.env.TEST_MIN_ETH || '0.5',
  minAmountERC20: process.env.TEST_MIN_ERC20 || ''
}

module.exports = config
