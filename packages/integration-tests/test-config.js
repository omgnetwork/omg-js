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
  geth_url: process.env.GETH_URL || 'https://rinkeby.infura.io',
  watcher_url: process.env.WATCHER_URL || 'http://dev-a960a7b-watcher.omg.network/',
  childchain_url: process.env.CHILDCHAIN_URL || 'http://dev-a960a7b-childchain.omg.network/',
  rootchainContract: process.env.ROOTCHAIN_CONTRACT || '0x61b3ccfaa1e2fbe5cf073dff470695de788aca69',
  contract_exchanger_url: process.env.CONTRACT_EXCHANGER_URL || 'http://localhost:5000/get_contract',
  testErc20Contract: process.env.TEST_ERC20_CONTRACT || '0xc778417E063141139Fce010982780140Aa0cD5Ab',
  fundAccount: process.env.FUND_ACCOUNT || '',
  fundAccountPrivateKey: process.env.FUND_ACCOUNT_PRIVATEKEY || '',
  fundAccountPassword: process.env.FUND_ACCOUNT_PASSWORD || '',
  testFaucetAddress: process.env.TEST_FAUCET_ADDRESS || '0xA013DEBD703E28AF78C2ffD0264ef70F978C5465',
  testFaucetPrivateKey: process.env.TEST_FAUCET_PRIVATEKEY || '0x3C1FEC09834B23FFAC9A773D1FC3F03E859F5163E1FEDC0EDFE3FED325B47A62',
  minAmountEth: process.env.TEST_MIN_ETH || '',
  minAmountERC20: process.env.TEST_MIN_ERC20 || ''
}

module.exports = config
