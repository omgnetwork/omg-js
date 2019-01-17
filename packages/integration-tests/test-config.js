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
  geth: {
    host: process.env.GETH_HOST || 'localhost',
    port: process.env.GETH_PORT || '8545'
  },
  watcher: {
    host: process.env.WATCHER_HOST || 'localhost',
    port: process.env.WATCHER_PORT || '7434'
  },
  childchain: {
    host: process.env.CHILDCHAIN_HOST || 'localhost',
    port: process.env.CHILDCHAIN_PORT || '9656'
  },
  plasmaContract: process.env.PLASMA_CONTRACT || '0xf27dda090f93e878acfff7bf650ed89a857ca9fe',
  testErc20Contract: process.env.TEST_ERC20_CONTRACT || '0xbfdf85743ef16cfb1f8d4dd1dfc74c51dc496434'
}

module.exports = config
