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
limitations under the License. */

const ChildChain = require('./packages/omg-js-childchain/src/childchain')
const RootChain = require('./packages/omg-js-rootchain/src/rootchain')
const OmgUtil = require('./packages/omg-js-util/src/index')
global.ChildChain = ChildChain
global.RootChain = RootChain
global.OmgUtil = OmgUtil
