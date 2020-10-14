## OMG-JS Examples

Both Alice's and Bob's Ethereum accounts need to have some ETH in them. The ETH is used for gas costs on the rootchain, fees on the childchain and the actual ETH transferred from Alice to Bob.
If you want to run the ERC20 examples, make sure the token address is recorded in your `.env` and either Alice or Bob has a balance on the rootchain.

## Running the Examples

To run the examples:
- `npm install` from root of `omg-js`.
- `npm run compile` from root of `omg-js`.
- `npm install` from `/examples` directory.
- Create `.env` file inside the root of the `/examples` directory with the appropriate values (see `/examples/.env.example` for example values)

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

## Helpful Scripts

From the `/examples` folder run the following scripts:

- [Get Alice's and Bob's balances](examples/print-balance.js)

    `npm run example print-balance -- --owner=alice`  
    `npm run example print-balance -- --owner=bob`

- [Get Alice's and Bob's Childchain UTXOs](examples/print-utxos.js)

    `npm run example print-utxos -- --owner=alice`  
    `npm run example print-utxos -- --owner=bob`

## ETH Examples

1. [Deposit some ETH from Alice's Rootchain to the Childchain](examples/deposit-eth.js)
    
    `npm run example deposit-eth -- --owner=alice --amount=0.01`

2. [Send some ETH from Alice's Childchain to Bob's Childchain](examples/transaction-eth.js)
    
    `npm run example transaction-eth -- --from=alice --to=bob --amount=0.001`

Alice has now sent some ETH to Bob. This should be reflected in Bob's childchain balance.

3. [Exit one of Bob's Childchain UTXOs to the Rootchain](examples/exit-eth.js)

    `npm run example exit-eth -- --owner=bob`

Checking Bob's final rootchain balance you will notice it will be a little less than expected. This is because of rootchain gas costs Bob had to pay to exit the childchain.

4. [Bob starts and piggyback's an inflight exit for his ouput on a transaction sent by Alice](example/inflight-exit-eth.js)

    `npm run example inflight-exit-eth -- --from=alice --to=bob --amount=0.01`

## ERC20 Examples

Before we begin, we need to deploy and mint some ERC20 tokens.
From the examples folder run the following command:

`npm run deploy-test-erc20`

Use the ERC20 contract address from the output above to configure `ERC20_CONTRACT_ADDRESS` in your `.env` file.

Now let's run through the same story above but for ERC20 deposit/transaction/exit.

1. [Deposit some ERC20 from Alice's Rootchain to the Childchain](examples/deposit-erc20.js)
    
    `npm run example deposit-erc20 -- --owner=alice --amount=10`

2. [Send some ERC20 from Alice's Childchain to Bob's Childchain](examples/transaction-erc20.js)
    
    `npm run example transaction-erc20 -- --from=alice --to=bob --amount=1`

3. [Exit one of Bob's Childchain ERC20 UTXOs to the Rootchain](examples/exit-erc20.js)

    `npm run example exit-erc20 -- --owner=bob`
