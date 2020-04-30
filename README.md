## OMG-JS 

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![CircleCI](https://circleci.com/gh/omisego/omg-js/tree/master.svg?style=svg)](https://circleci.com/gh/omisego/omg-js/tree/master)

This is a Javascript library that allows you to interact with OmiseGo's MoreVP implementation of Plasma. It provides functions to:

1. Deposit (Eth/Token) from the Root chain into the Child chain.
2. Transact on the Child chain.
3. Exit from the Child chain back to the Root chain.
4. Challenge an invalid exit.

## Compatibility

`omg-js` follows a modified semver with the first part referring to its own library versioning and the second part referring to its compatible `elixir-omg` version.

## Getting Started

The project is organized into 3 submodules:

1. @omisego/omg-js-rootchain
2. @omisego/omg-js-childchain
3. @omisego/omg-js-util

You can use any of them separately, or all at once by importing the parent `@omisego/omg-js` package.

## Installation

#### Node
Requires Node >= 8.11.3 < 13.0.0
```
npm install @omisego/omg-js
```

#### Browser
You can add `omg-js` to a website quickly. Just add this script tag.
```
<script src="https://unpkg.com/@omisego/browser-omg-js"></script>
```

#### React Native
`omg-js` can easily be integrated with React Native projects.
First, add this postinstall script to your project's `package.json`
```
"scripts": {
    "postinstall": "omgjs-nodeify"
}
```

Then install the react native compatible library.
```
npm install @omisego/react-native-omg-js
```

## API Documentation

[Documentation for omg-js ](https://docs.omg.network/omg-js/)

## Design Documentation

[Sending a transaction](/integration-docs/transactions.md)  
[How to sign a transaction](/integration-docs/signing-methods.md)

## Examples

#### Prerequisites

Both Alice's and Bob's Ethereum accounts need to have some ETH in them. The ETH is used for gas costs on the rootchain, fees on the childchain and the actual ETH transferred from Alice to Bob.
If you want to run the ERC20 examples, make sure the token address is recorded in your `.env` and either Alice or Bob has a balance on the rootchain.

#### Running the Examples

You can find example code inside the `examples` folder. 

To run the examples:
- `npm install` from root of `omg-js`.
- Step inside the `/examples` directory.
- Run `npm install`.
- Create `.env` file inside the root of the `/examples` directory with the appropriate values (see `/examples/env.example` for an example)

- Refer to below explanation of `.env` variables
```
ETH_NODE=                           <entry point to an ethereum node>
WATCHER_URL=                        <url of an informational watcher>
WATCHER_PROXY_URL=                  <*optional* proxy server to catch all watcher requests>
PLASMAFRAMEWORK_CONTRACT_ADDRESS=   <address of the plasma_framework contract>
ERC20_CONTRACT_ADDRESS=             <*optional* address of the erc20 contract that Alice will deposit and transfer to Bob>
ALICE_ETH_ADDRESS=                  <address of Alice's account>
ALICE_ETH_ADDRESS_PRIVATE_KEY=      <Alice's private key>
BOB_ETH_ADDRESS=                    <address of Bob's account>
BOB_ETH_ADDRESS_PRIVATE_KEY=        <Bob's private key>
MILLIS_TO_WAIT_FOR_NEXT_BLOCK=      <interval when checking for block confirmation>
BLOCKS_TO_WAIT_FOR_TXN=             <amount of blocks to wait for confirmation>
```

Let's run through a story between Alice and Bob. In this story, Alice will first deposit some ETH from the root chain into the child chain. Then Alice will transfer some of that ETH to Bob on the child chain. Bob will then exit his funds from the child chain back into the root chain. His root chain balance will be reflected with the extra ETH that Alice sent to him on the child chain.

*_Note_* you can modify the values of the passed flags to suit your needs

#### Helpful Scripts

From the `/examples` folder run the following scripts:

- [Get Alice's and Bob's balances](examples/balances.js)

    `node print-balance --owner=alice`  
    `node print-balance --owner=bob`

- [Get Alice's and Bob's Childchain UTXOs](examples/childchain-utxos.js)

    `node print-utxos --owner=alice`  
    `node print-utxos --owner=bob`

#### ETH Examples

1. [Deposit some ETH from Alice's Rootchain to the Childchain](examples/childchain-deposit-eth.js)
    
    `node deposit-eth --owner=alice --amount=0.01`

2. [Send some ETH from Alice's Childchain to Bob's Childchain](examples/childchain-transaction-eth.js)
    
    `node transaction-eth --from=alice --to=bob --amount=0.001`

Alice has now sent some ETH to Bob. This should be reflected in Bob's childchain balance.

3. [Exit one of Bob's Childchain UTXOs to the Rootchain](examples/childchain-exit-eth.js)

    `node exit-eth --owner=bob`

Checking Bob's final rootchain balance you will notice it will be a little less than expected. This is because of rootchain gas costs Bob had to pay to exit the childchain.

4. [Bob starts and piggyback's an inflight exit for his ouput on a transaction sent by Alice](example/childchain-inflight-exit-eth.js)

    `node inflight-exit-eth --from=alice --to=bob --amount=0.01`

#### ERC20 Examples

Before we begin, we need to deploy and mint some ERC20 tokens.
From the examples folder run the following command:

```
npm run deploy-test-erc20 --prefix ../packages/integration-tests
```

Use the ERC20 contract address from the output above to configure `ERC20_CONTRACT_ADDRESS` in your `.env` file.

Now let's run through the same story above but for ERC20 deposit/transaction/exit.

1. [Deposit some ERC20 from Alice's Rootchain to the Childchain](examples/childchain-deposit-erc20.js)
    
    `node deposit-erc20 --owner=alice --amount=10`

2. [Send some ERC20 from Alice's Childchain to Bob's Childchain](examples/childchain-transaction-erc20.js)
    
    `node transaction-erc20 --from=alice --to=bob --amount=1`

3. [Exit one of Bob's Childchain ERC20 UTXOs to the Rootchain](examples/childchain-exit-erc20.js)

    `node exit-erc20 --owner=bob`
