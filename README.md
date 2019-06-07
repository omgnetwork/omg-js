## OMG-JS 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

This is a Javascript library that allows you to interact with OmiseGo's MoreVP implementation of Plasma. It provides functions to:

1. Deposit (Eth/Token) from the Root chain into the Child chain.
2. Transact on the Child chain.
3. Exit from the Child chain back to the Root chain.
4. Challenge an invalid exit.

## Compatibility

This library is currently compatible with version 0.2 of the OMG Network

### Getting Started

The project is organized into 3 submodules:

1. @omisego/omg-js-rootchain
2. @omisego/omg-js-childchain
3. @omisego/omg-js-util

You can use any of them separately, or all at once by importing the parent `@omisego/omg-js` package

### Installation

#### Node
Requires Node >= 8.11.3
```
npm install @omisego/omg-js
```


#### Browser
Copy the `dist/omg.js` file into your project and include it.
```
<script type="text/javascript" src="omg.js"></script>
```


### API Documentation

[Documentation for omg-js ](http://omisego.github.io/omg-js)

### Design Documentation

[How to sign a transaction](/integration-docs/signing-methods.md)

### Examples

You can find example code inside `examples` folder

[Deposit ETH through Rootchain Contract](examples/node-deposit.js)

[Transact ETH on the Child chain](examples/node-transact.js)

[Get spendable UTXO of an address](examples/fetch-utxo.js)

