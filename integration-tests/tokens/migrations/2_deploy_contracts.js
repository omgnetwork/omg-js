/* eslint-disable no-undef */
const ERC20 = artifacts.require('./ERC20.sol')

module.exports = function (deployer, network, accounts) {
  deployer.deploy(ERC20, 1000000)
}
