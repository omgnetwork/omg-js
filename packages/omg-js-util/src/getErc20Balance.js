const erc20abi = require('human-standard-token-abi')

async function getERC20Balance ({ web3, address, erc20Address }) {
  const erc20Contract = new web3.eth.Contract(erc20abi, erc20Address)
  const txDetails = {
    from: address,
    to: erc20Address,
    data: erc20Contract.methods.balanceOf(address).encodeABI()
  }
  return web3.eth.call(txDetails)
}

module.exports = getERC20Balance
