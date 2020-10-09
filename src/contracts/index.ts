import { Contract } from 'web3-eth-contract';
import erc20abi from 'human-standard-token-abi';

import * as Constants from '@lib/common/constants';

import Erc20VaultContract from '@lib/contracts/abi/Erc20Vault.json';
import EthVaultContract from '@lib/contracts/abi/EthVault.json';
import PaymentExitGameContract from '@lib/contracts/abi/PaymentExitGame.json';
import PriorityQueueContract from '@lib/contracts/abi/PriorityQueue.json';

export interface IVault {
  contract: Contract;
  address: string;
}

export interface IPaymentExitGame extends IVault {
  bonds: {
    standardExit: number;
    piggyback: number;
    inflightExit: number;
  }
}

/** @internal */
export async function getErc20Vault (): Promise<IVault> {
  const address: string = await this.plasmaContract.methods.vaults(Constants.ERC20_VAULT_ID).call();
  const contract: Contract = new this.web3Instance.eth.Contract((Erc20VaultContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getEthVault (): Promise<IVault> {
  const address: string = await this.plasmaContract.methods.vaults(Constants.ETH_VAULT_ID).call();
  const contract: Contract = new this.web3Instance.eth.Contract((EthVaultContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getPaymentExitGame (): Promise<IPaymentExitGame> {
  const address: string = await this.plasmaContract.methods.exitGames(Constants.EXIT_GAME_PAYMENT_TYPE).call();
  const contract: Contract = new this.web3Instance.eth.Contract((PaymentExitGameContract as any).abi, address);

  const bondSizes = await Promise.all([
    contract.methods.startStandardExitBondSize().call(),
    contract.methods.piggybackBondSize().call(),
    contract.methods.startIFEBondSize().call()
  ]);

  return {
    contract,
    address,
    bonds: {
      standardExit: Number(bondSizes[0]),
      piggyback: Number(bondSizes[1]),
      inflightExit: Number(bondSizes[2])
    }
  };
}

/** @internal */
export async function getPriorityQueue (address: string): Promise<IVault> {
  const contract: Contract = new this.web3Instance.eth.Contract((PriorityQueueContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getErc20 (address: string): Promise<IVault> {
  const contract: Contract = new this.web3Instance.eth.Contract(erc20abi, address);
  return { contract, address };
}

/** @internal */
export function getTxData (contract: Contract, method: string, ...args: any): string {
  return contract.methods[method](...args).encodeABI();
}
