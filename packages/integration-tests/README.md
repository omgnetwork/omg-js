To run the integration tests, there is some manual setup involved:
1. `geth`, `childchain` and `watcher` need to be running. See [elixir-omg](https://github.com/omisego/elixir-omg) for instructions.
2. Add each service's host and port to the `test-config.js` file (or the environment).
3. Geth `eth.accounts[0]` must have a blank password and hold some test ETH.
4. The RootChain contract address must be added to `test-config.js`.
5. The test ERC20 contract must be deployed, and its address added to `test-config.js`. You can do this by running `../../../node_modules/.bin/truffle deploy` in the `packages/integration-tests/tokens` directory. The ERC20 contract address appears in the resulting output.
6. Finally, run the tests from the repo root dir with `npm run integration-test`