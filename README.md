## OMG.JS 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

### JavaScript Library Implementation for Tesuji 

IMPORTANT: 
* this was developed against the first release version of `elixir-omg` 
* This is a first implementation of a JS library, expect breaking changes

This is a library that allows a Client/Server JavaScript application to Interact with the Tesuji Plasma
So that you could:

1. Deposit (Eth/Token)
2. Transact (Eth/Token)

From the Childchain server to the Rootchain

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

### Getting Started

The project is seperated into 2 submodules:

1. omg-js-childchain
2. omg-js-rootchain

you could use import each one seperately, or use both via importing omg-js module

#### Documentation

[Documentation for omg-js-childchain](packages/omg-js-childchain/src/docs/index.html)

[Documentation for omg-js-rootchain ](packages/omg-js-rootchain/src/docs/index.html)

#### Example Implementations

You can find example applications inside `examples` folder

[Deposit ETH through Rootchain Contract](examples/node-deposit.js)

[Transact ETH through Childchain](examples/node-sendTx.js)

[Fetch spendable UTXO of an address](examples/fetch-utxo.js)

