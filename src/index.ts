// dependencies
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import * as Joi from '@hapi/joi';

// modules
import * as ExitQueueModule from 'rootchain/exitqueue';
import * as DepositModule from 'rootchain/deposit';
import * as ContractsModule from 'contracts';
import * as Constants from 'util/constants';
// import * as Watcher from 'watcher';
import PlasmaFrameworkContract from 'contracts/abi/PlasmaFramework.json';
import { OmgJSError } from 'errors';

// validators
import * as Validators from 'validators';

// interfaces
import { IVault, IPaymentExitGame } from 'contracts';

interface IOmgJS {
  plasmaContractAddress: string;
  watcherUrl: string;
  web3Provider: any;
}

class OmgJS {
  static currency = Constants.currencyMap;

  private readonly plasmaContractAddress: string;
  private readonly watcherUrl: string;
  private readonly web3Instance: Web3;
  private readonly plasmaContract: Contract;

  private erc20Vault: IVault;
  private ethVault: IVault;
  private paymentExitGame: IPaymentExitGame;

  public constructor({
    plasmaContractAddress,
    watcherUrl,
    web3Provider
  }: IOmgJS) {
    Joi.assert({ plasmaContractAddress, watcherUrl, web3Provider }, Validators.constructorSchema);
    this.plasmaContractAddress = plasmaContractAddress;
    this.watcherUrl = watcherUrl;
    this.web3Instance = new Web3(web3Provider);
    this.plasmaContract = new Contract((PlasmaFrameworkContract as any).abi, plasmaContractAddress);
  }

  private async getErc20Vault (): Promise<IVault> {
    if (this.erc20Vault) {
      return this.erc20Vault;
    }
    this.erc20Vault = await ContractsModule.getErc20Vault();
    return this.erc20Vault;
  }

  private async getEthVault (): Promise<IVault> {
    if (this.ethVault) {
      return this.ethVault;
    }
    this.ethVault = await ContractsModule.getEthVault();
    return this.ethVault;
  }

  private async getPaymentExitGame (): Promise<IPaymentExitGame> {
    if (this.paymentExitGame) {
      return this.paymentExitGame;
    }
    this.paymentExitGame = await ContractsModule.getPaymentExitGame();
    return this.paymentExitGame;
  }

  public async getExitTime ({
    exitRequestBlockNumber,
    submissionBlockNumber
  }: ExitQueueModule.IGetExitTime): Promise<ExitQueueModule.IExitTime> {
    Joi.assert({ exitRequestBlockNumber, submissionBlockNumber }, Validators.getExitTimeSchema);
    try {
      return await ExitQueueModule.getExitTime({
        exitRequestBlockNumber,
        submissionBlockNumber
      });
    } catch (error) {
      throw new OmgJSError({
        origin: 'getExitTime',
        message: error.message,
        path: 'ROOTCHAIN'
      });
    }
  }

  public async getExitQueue (token: string): Promise<ExitQueueModule.IExitQueue[]> {
    Joi.assert(token, Validators.getExitQueueSchema);
    try {
      return await ExitQueueModule.getExitQueue(token);
    } catch (error) {
      throw new OmgJSError({
        origin: 'getExitQueue',
        message: error.message,
        path: 'ROOTCHAIN'
      });
    }
  }

  public async approveDeposit ({
    erc20Address,
    amount,
    transactionOptions
  }: DepositModule.IApproveDeposit): Promise<DepositModule.TransactionReceipt> {
    Joi.assert({ erc20Address, amount, transactionOptions }, Validators.approveTokenSchema);
    try {
      return await DepositModule.approveDeposit({
        erc20Address,
        amount,
        transactionOptions
      })
    } catch (error) {
      throw new OmgJSError({
        origin: 'approveDeposit',
        message: error.message,
        path: 'ROOTCHAIN'
      });
    }
  }
}

export default OmgJS;
