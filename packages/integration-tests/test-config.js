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
    port: process.env.WATCHER_PORT || '4000'
  },
  childchain: {
    host: process.env.CHILDCHAIN_HOST || 'localhost',
    port: process.env.CHILDCHAIN_PORT || '9656'
  },
  plasmaContract: process.env.PLASMA_CONTRACT || '0x518b624fbdf288908f50acfc9d60df4466e82d3e'
}

module.exports = config
