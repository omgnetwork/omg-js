## OMG-JS Integration Tests

To run the integration tests, there is some manual setup involved:

1. `geth`, `childchain` and `watcher` need to be running. See [elixir-omg](https://github.com/omisego/elixir-omg) for instructions.
2. Geth `eth.accounts[0]` must have a blank password and hold some test ETH.
3. Create and populate a `.env` file. See `.env.example` as an example.
4. The test ERC20 contract must be deployed, and its address added to your environment. You can do this by running `npm run deploy-test-erc20` from the `/integration-tests` directory. The ERC20 contract address appears in the resulting output. Add this to your `.env` file.
5. Finally, run the tests

## Running the Tests

There are 2 options to run the test suite
1. The quickest option is to run them in parallel using `npm run parallel-test`.
2. The slowest option is to run them all in sequence using `npm run sequence-test`

## Returning Test Funds

Each test file uses its own dedicated faucet (identified by the FAUCET_SALT defined in your test config). If you need to return these funds back to the fund account, you can run `npm run cleanup-faucets`. 

*Childchain funds will be returned to the fundAccount's childchain account.

Note that some funds may fail to be returned:
1. Not having enough balance to cover transaction gas costs
2. Not having an ETH UTXO to cover fees on the childchain

## Important

- If running the full test suite, you must be running against contracts that have a minimum exit period of at least 120 seconds.