/*
Copyright 2020 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import { Contract } from 'web3-eth-contract';
import erc20abi from 'human-standard-token-abi';

import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/interfaces';

import Erc20VaultContract from '@lib/contracts/abi/Erc20Vault.json';
import EthVaultContract from '@lib/contracts/abi/EthVault.json';
import PaymentExitGameContract from '@lib/contracts/abi/PaymentExitGame.json';
import PriorityQueueContract from '@lib/contracts/abi/PriorityQueue.json';

/** @internal */
export async function getErc20Vault (): Promise<Interfaces.IVault> {
  const address: string = await this.plasmaContract.methods.vaults(Constants.ERC20_VAULT_ID).call();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract: Contract = new this.web3Instance.eth.Contract((Erc20VaultContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getEthVault (): Promise<Interfaces.IVault> {
  const address: string = await this.plasmaContract.methods.vaults(Constants.ETH_VAULT_ID).call();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract: Contract = new this.web3Instance.eth.Contract((EthVaultContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getPaymentExitGame (): Promise<Interfaces.IPaymentExitGame> {
  const address: string = await this.plasmaContract.methods.exitGames(Constants.EXIT_GAME_PAYMENT_TYPE).call();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function getPriorityQueue (address: string): Promise<Interfaces.IVault> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contract: Contract = new this.web3Instance.eth.Contract((PriorityQueueContract as any).abi, address);
  return { contract, address };
}

/** @internal */
export async function getErc20 (address: string): Promise<Interfaces.IVault> {
  const contract: Contract = new this.web3Instance.eth.Contract(erc20abi, address);
  return { contract, address };
}

/** @internal */
export function getTxData (
  contract: Contract,
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: Array<any>
): string {
  return contract.methods[method](...args).encodeABI();
}
