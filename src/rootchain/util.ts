import web3Utils from 'web3-utils';

import * as Util from '@lib/common/util';
import * as ContractsModule from '@lib/contracts';

export async function getEVMErrorReason (txhash: string): Promise<string> {
  const tx = await this.web3Instance.eth.getTransaction(txhash);
  if (tx) {
    const code = await this.web3Instance.eth.call(tx, tx.blockNumber);
    if (code && code.substr(138)) {
      return this.web3Instance.utils.toAscii(Util.prefixHex(code.substr(138)));
    }
  }
}

export interface IGetRootchainERC20Balance {
  address: string;
  erc20Address: string;
};

export async function getRootchainERC20Balance ({
  address,
  erc20Address
}: IGetRootchainERC20Balance): Promise<string> {
  const { contract } = await ContractsModule.getErc20.call(this, erc20Address);

  const balance = await this.web3Instance.eth.call({
    from: address,
    to: erc20Address,
    data: contract.methods.balanceOf(address).encodeABI()    
  });

  return web3Utils.hexToNumberString(balance);
}