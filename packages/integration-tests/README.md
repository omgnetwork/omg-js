To run the integration tests, there is some manual setup involved:
1. `geth`, `childchain` and `watcher` need to be running. See [elixir-omg](https://github.com/omisego/elixir-omg) for instructions.
2. Create a `.env` file. See `env.docker.example` as an example.
3. Add each service's host and port to your environment.
4. Geth `eth.accounts[0]` must have a blank password and hold some test ETH.
5. The PlasmaFramework contract address must be added to your environment.
6. The test ERC20 contract must be deployed, and its address added to your environment. You can do this by running `npm run deploy-test-erc20` from the integration-tests directory. The ERC20 contract address appears in the resulting output.
7. Finally, run the tests from the repo root dir with `npm run integration-test`