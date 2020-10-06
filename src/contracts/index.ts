import { Contract } from 'web3-eth-contract';
import erc20abi from 'human-standard-token-abi';

import Erc20VaultContract from 'contracts/abi/Erc20Vault.json';
import EthVaultContract from 'contracts/abi/EthVault.json';
import PaymentExitGameContract from 'contracts/abi/PaymentExitGame.json';
import PriorityQueueContract from 'contracts/abi/PriorityQueue.json';

const ETH_VAULT_ID = 1;
const ERC20_VAULT_ID = 2;
const PAYMENT_TYPE = 1;

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

export async function getErc20Vault (): Promise<IVault> {
  const address: string = await this.plasmaContract.methods.vaults(ERC20_VAULT_ID).call();
  const contract: Contract = new Contract((Erc20VaultContract as any).abi, address);
  return { contract, address };
}

export async function getEthVault (): Promise<IVault> {
  const address: string = await this.plasmaContract.methods.vaults(ETH_VAULT_ID).call();
  const contract: Contract = new Contract((EthVaultContract as any).abi, address);
  return { contract, address };
}

export async function getPaymentExitGame (): Promise<IPaymentExitGame> {
  const address: string = await this.plasmaContract.methods.exitGames(PAYMENT_TYPE).call();
  const contract: Contract = new Contract((PaymentExitGameContract as any).abi, address);

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

export async function getPriorityQueue (address: string): Promise<IVault> {
  const contract: Contract = new Contract((PriorityQueueContract as any).abi, address);
  return { contract, address };
}

export async function getErc20 (address: string): Promise<IVault> {
  const contract: Contract = new Contract(erc20abi, address);
  return { contract, address };
}

export function getTxData (contract: Contract, method: string, ...args: any): any {
  return contract.methods[method](...args).encodeABI();
}
