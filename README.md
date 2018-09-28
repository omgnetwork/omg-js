## OMG.JS 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

### JavaScript Library Implementation for Tesuji 

IMPORTANT: 
* this was developed against the `elixir-omg` specific commit hash: dc4d176d3f5d27030e1e627bd5cc0a630690c178 
* This is a first implementation of a JS library, things WILL break
* any direct childchain interaction is expected to be depracated in the future

This is a library that allows a Client/Server JavaScript application to Interact with the Tesuji Plasma
So that you could:

1. Deposit (Eth/Token)
2. Transact (Eth/Token)

ETH/Token From the Rootchain contract to be spendable within Childchain server

### Installation

Please make sure you have `Node` (>v8.11.3) and also `npm` (>v6.3.0) installed
0. Clone the repository
1. Install all the packages
```
npm install
```
2. Test to make sure everything is installed correctly, please run:

```
npm run test
```

Alternatively, you could run an end-to-end test (deposit to transact) by configuring `deposit-transact-eth.js` test inside test/integration folder and running `npm run integration`

### Getting Started
#### Initializing
Make sure that you have `elixir-omg` running locally with `watcher, childchain, geth node` all accessble
Before running any functions, you must first initialize new Omg object with following parameters:
watcherUrl, childChainUrl, web3Provider, plasmaAddr

```
const Omg = new OMG(watcherUrl, childChainUrl, web3Provider, plasmaAddr)
```

### Implementation
_Server Side_

You can find example node.js and browser applications inside `examples` folder. 

_Client Side_ 

to use library on the client side, run `npm run build` and use the `bundle` file in dist directory
