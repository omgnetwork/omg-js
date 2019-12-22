## OMG-JS 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

This is a Javascript library that allows you to interact with OmiseGo's MoreVP implementation of Plasma. It provides functions to:

1. Deposit (Eth/Token) from the Root chain into the Child chain.
2. Transact on the Child chain.
3. Exit from the Child chain back to the Root chain.
4. Challenge an invalid exit.

## Compatibility

This library is currently compatible with version 0.3 of the OMG Network.
Below you can find a compatibility table of `omg-js` with `elixir-omg` and `plasma-contracts` SHAs

| Version | elixir-omg | plasma-contracts |
| --- | --- | --- |
| 3.0.0-alpha.12 (current) | 40f899b | 835d10c |
| 3.0.0-alpha.11 | 02e67bf | a7e8503 |
| 3.0.0-alpha.6 | 70e9a68 | 1608296 |

## Getting Started

The project is organized into 3 submodules:

1. @omisego/omg-js-rootchain
2. @omisego/omg-js-childchain
3. @omisego/omg-js-util

You can use any of them separately, or all at once by importing the parent `@omisego/omg-js` package

## Installation

#### Node
Requires Node >= 8.11.3 < 13.0.0
```
npm install @omisego/omg-js
```


#### Browser
Copy the `dist/omg.js` file into your project and include it.
```
<script type="text/javascript" src="omg.js"></script>
```


## API Documentation

[Documentation for omg-js ](http://omisego.github.io/omg-js)

## Design Documentation

[How to sign a transaction](/integration-docs/signing-methods.md)

## Examples

#### Prerequisites

Both Alice's and Bob's Ethereum accounts need to have some ETH in them. The ETH is used for gas costs on the rootchain, fees on the childchain and the actual ETH transferred from Alice to Bob.
If you want to run the ERC20 examples, at least Alice's account will need an ERC20 balance to be able to deposit and transact on the childchain.

#### Running the Examples

You can find example code inside `examples` folder. 

To run the examples:
- `npm install` from root of `omg-js`.
- `npm run lerna-reset` from root of `omg-js`.
- Step inside the `/examples` directory.
- Run `npm install`.
- Create `.env` file inside the root of the `/examples` directory with the appropriate values (see `/examples/env.example` for an example)

- Refer to below explanation of `.env` variables
```
GETH_URL=                       <entry point to an ethereum node>
WATCHER_URL=                    <url of an informational watcher>
WATCHER_PROXY_URL=              <*optional* proxy server to catch all watcher requests>
PLASMA_FRAMEWORK=               <address of the plasma_framework contract>
ERC20_CONTRACT=                 <*optional* address of the erc20 contract that Alice will deposit and transfer to Bob>
ALICE_ETH_ADDRESS=              <address of Alice's account>
ALICE_ETH_ADDRESS_PRIVATE_KEY=  <Alice's private key>
ALICE_ETH_DEPOSIT_AMOUNT=       <ETH amount Alice will deposit into the childchain>
ALICE_ERC20_DEPOSIT_AMOUNT=     <ERC20 amount Alice will deposit into the childchain>
ALICE_ETH_TRANSFER_AMOUNT=      <ETH amount Alice will transfer to Bob>
ALICE_ERC20_TRANSFER_AMOUNT=    <ERC20 amount Alice will transfer to Bob>
BOB_ETH_ADDRESS=                <address of Bob's account>
BOB_ETH_ADDRESS_PRIVATE_KEY=    <Bob's private key>
MILLIS_TO_WAIT_FOR_NEXT_BLOCK=  <interval when checking for block confirmation>
BLOCKS_TO_WAIT_FOR_TXN=         <amount of blocks to wait for confirmation>
```

Let's run through a story between Alice and Bob. In this story, Alice will first deposit some ETH from the root chain into the child chain. Then Alice will transfer some of that ETH to Bob on the child chain. Bob will then exit his funds from the child chain back into the root chain. His root chain balance will be reflected with the extra ETH that Alice sent to him on the child chain.

#### Helpful Scripts

From the `/examples` folder run the following scripts:

- [Get Alice's and Bob's balances](examples/balances.js)

    `npm run balances`

- [Get Alice's and Bob's Childchain UTXOs](examples/childchain-utxos.js)

    `npm run childchain-utxos`

#### ETH Examples

1. [Deposit some ETH from Alice's Rootchain to the Childchain](examples/childchain-deposit-eth.js)
    
    `npm run childchain-deposit-eth`

2. [Send some ETH from Alice's Childchain to Bob's Childchain](examples/childchain-transaction-eth.js)
    
    `npm run childchain-transaction-eth`

Alice has now sent some ETH to Bob. This should be reflected in Bob's childchain balance.

3. [Exit one of Bob's Childchain UTXOs to the Rootchain](examples/childchain-exit-eth.js)

    `npm run childchain-exit-eth`

Checking Bob's final rootchain balance you will notice it will be a little less than expected. This is because of rootchain gas costs Bob had to pay to exit the childchain.

4. [Bob starts and piggyback's an inflight exit for his ouput on a transaction sent by Alice](example/childchain-inflight-exit-eth.js)

    `npm run childchain-inflight-exit-eth`

#### ERC20 Examples

Now let's run through the same story above but for ERC20 deposit/transaction/exit.

1. [Deposit some ERC20 from Alice's Rootchain to the Childchain](examples/childchain-deposit-erc20.js)
    
    `npm run childchain-deposit-erc20`

2. [Send some ERC20 from Alice's Childchain to Bob's Childchain](examples/childchain-transaction-erc20.js)
    
    `npm run childchain-transaction-erc20`

3. [Exit one of Bob's Childchain ERC20 UTXOs to the Rootchain](examples/childchain-exit-erc20.js)

    `npm run childchain-exit-erc20`
