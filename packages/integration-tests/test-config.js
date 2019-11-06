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
  geth_url: process.env.GETH_URL || 'http://localhost:8545',
  watcher_url: process.env.WATCHER_URL || 'http://localhost:7434',
  childchain_url: process.env.CHILDCHAIN_URL || 'http://localhost:9656',
  rootchainContract: process.env.ROOTCHAIN_CONTRACT || '0xa1d683a00f63dda0cde68349ebfd38513d79433f',
  contract_exchanger_url: process.env.CONTRACT_EXCHANGER_URL || 'http://localhost:8000/contracts',
  testErc20Contract: process.env.TEST_ERC20_CONTRACT || '0xc9d8c49e880fefa92c6492ca17c418805628b01b',
  fundAccount: process.env.FUND_ACCOUNT || '0x6de4b3b9c28e9c3e84c2b2d3a875c947a84de68d',
  fundAccountPrivateKey: process.env.FUND_ACCOUNT_PRIVATEKEY || 'd885a307e35738f773d8c9c63c7a3f3977819274638d04aaf934a1e1158513ce',
  fundAccountPassword: process.env.FUND_ACCOUNT_PASSWORD || '',
  testFaucetAddress: process.env.TEST_FAUCET_ADDRESS || '0x6de4b3b9c28e9c3e84c2b2d3a875c947a84de68d',
  testFaucetPrivateKey: process.env.TEST_FAUCET_PRIVATEKEY || 'd885a307e35738f773d8c9c63c7a3f3977819274638d04aaf934a1e1158513ce',
  minAmountEth: process.env.TEST_MIN_ETH || '0.5',
  minAmountERC20: process.env.TEST_MIN_ERC20 || ''
}

module.exports = config
