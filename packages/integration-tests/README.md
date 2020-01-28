## Setup

To run the integration tests, there is some manual setup involved:

1. `geth`, `childchain` and `watcher` need to be running. See [elixir-omg](https://github.com/omisego/elixir-omg) for instructions.
2. Create and populate `.env` file in the root of `omg-js`. See `env.docker.example` as an example.
3. Geth `eth.accounts[0]` must have a blank password and hold some test ETH.
4. The test ERC20 contract must be deployed, and its address added to your environment. You can do this by running `npm run deploy-test-erc20` from the `packages/integration-tests` directory. The ERC20 contract address appears in the resulting output. Add this to your `.env` file.
5. Finally, run the tests

## Running Tests

There are 3 options to run the test suite
1. The quickest option is to run them in parallel using `npm run prallel-test`
2. The slowest option is to run them in sequence using `npm run sequence-test`
3. Running tests flagged with the `ci-enabled` flag is done by `npm run ci-test`

## Important

- If running the full test suite, you must be running against contracts that have a minimum exit period of at least 120 seconds.