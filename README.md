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

You can find example code inside `examples` folder. To run the examples, step inside the `examples` directory. Run `npm install`. Edit your `config.js` file to have to correct values.

_Note: You may need to also run `npm install` in the `packages\omg-js-rootchain`, `packages\omg-js-childchain` and `packages\omg-js-util` directories._

Let's run through a story between Alice and Bob. In this story, Alice will first deposit 2 ETH from the root chain into the child chain. Then Alice will transfer 1 ETH to Bob on the child chain. Finally, Bob will exit his funds from the child chain back into the root chain. His root chain balance will be reflected with the extra 1 ETH that Alice sent to him on the child chain.

From the `examples` folder run the scripts below in order to follow the story.

1. [Deposit 2 ETH from Alice's Rootchain to the Childchain](examples/childchain-deposit.js)
    
    `npm run childchain-deposit`

2. [Send 1 ETH from Alice's Childchain to Bob's Childchain](examples/childchain-transaction.js)
    
    `npm run childchain-transaction`

Alice has now sent some ETH to Bob. You should see a UTXO for Alice and a UTXO for Bob as a result of this transaction.

3. [Get Alice's and Bob's Childchain UTXOs](examples/childchain-utxos.js)

    `npm run childchain-utxos`

4. [Transfer (exit) all of Bob's Childchain funds to the Rootchain](examples/childchain-exit.js)

    `npm run childchain-exit`


