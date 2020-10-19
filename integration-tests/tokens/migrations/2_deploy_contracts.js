/* eslint-disable no-undef */
const ERC20 = artifacts.require('./ERC20.sol')

module.exports = function (deployer) {
  deployer.deploy(ERC20, 1000000)
}
