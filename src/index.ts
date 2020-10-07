import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { HttpProvider } from 'web3-providers-http';
import * as Joi from '@hapi/joi';

import * as StandardExitModule from '@lib/rootchain/standardexit';
import * as InflightExitModule from '@lib/rootchain/inflightexit';
import * as ExitQueueModule from '@lib/rootchain/exitqueue';
import * as DepositModule from '@lib/rootchain/deposit';
import * as ContractsModule from '@lib/contracts';
import * as Constants from '@lib/common/constants';
import PlasmaFrameworkContract from '@lib/contracts/abi/PlasmaFramework.json';

import * as Validators from '@lib/validators';

import { IVault, IPaymentExitGame } from '@lib/contracts';
import { ITransactionReceipt } from '@lib/common/interfaces';

interface IOmgJS {
  plasmaContractAddress: string;
  watcherUrl: string;
  web3Provider: Partial<HttpProvider>;
}

class OmgJS {
  static currency = Constants.CURRENCY_MAP;

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
    this.web3Instance = new (Web3 as any)(
      web3Provider,
      null,
      { transactionConfirmationBlocks: 1 }
    );
    this.plasmaContract = new this.web3Instance.eth.Contract(
      (PlasmaFrameworkContract as any).abi,
      plasmaContractAddress
    );
  }

  private async getErc20Vault (): Promise<IVault> {
    if (this.erc20Vault) {
      return this.erc20Vault;
    }
    this.erc20Vault = await ContractsModule.getErc20Vault.call(this);
    return this.erc20Vault;
  }

  private async getEthVault (): Promise<IVault> {
    if (this.ethVault) {
      return this.ethVault;
    }
    this.ethVault = await ContractsModule.getEthVault.call(this);
    return this.ethVault;
  }

  private async getPaymentExitGame (): Promise<IPaymentExitGame> {
    if (this.paymentExitGame) {
      return this.paymentExitGame;
    }
    this.paymentExitGame = await ContractsModule.getPaymentExitGame.call(this);
    return this.paymentExitGame;
  }

  public async getExitTime ({
    exitRequestBlockNumber,
    submissionBlockNumber
  }: ExitQueueModule.IGetExitTime): Promise<ExitQueueModule.IExitTime> {
    Joi.assert({ exitRequestBlockNumber, submissionBlockNumber }, Validators.getExitTimeSchema);
    return ExitQueueModule.getExitTime.call(this, {
      exitRequestBlockNumber,
      submissionBlockNumber
    });
  }

  public async getExitQueue (token: string): Promise<ExitQueueModule.IExitQueue[]> {
    Joi.assert(token, Validators.getExitQueueSchema);
    return ExitQueueModule.getExitQueue.call(this, token);
  }

  public encodeDeposit ({
    owner,
    amount,
    currency
  }: DepositModule.IEncodeDeposit): string {
    Joi.assert({ owner, amount, currency }, Validators.encodeDepositSchema);
    return DepositModule.encodeDeposit.call(this, {
      owner,
      amount,
      currency
    });
  }

  public async approveERC20Deposit ({
    erc20Address,
    amount,
    transactionOptions
  }: DepositModule.IApproveDeposit): Promise<ITransactionReceipt> {
    Joi.assert({ erc20Address, amount, transactionOptions }, Validators.approveTokenSchema);
    return DepositModule.approveERC20Deposit.call(this, {
      erc20Address,
      amount,
      transactionOptions
    });
  }

  public async deposit ({
    amount,
    currency,
    transactionOptions,
  }: DepositModule.IDeposit): Promise<ITransactionReceipt> {
    Joi.assert({ amount, currency, transactionOptions }, Validators.depositSchema);
    return DepositModule.deposit.call(this, {
      amount,
      currency,
      transactionOptions
    });
  }

  public async getStandardExitId ({
    txBytes,
    utxoPos,
    isDeposit
  }: StandardExitModule.IGetStandardExitId): Promise<string> {
    Joi.assert({ txBytes, utxoPos, isDeposit }, Validators.getStandardExitIdSchema);
    return StandardExitModule.getStandardExitId.call(this, {
      txBytes,
      utxoPos,
      isDeposit
    });
  }

  public async getInFlightExitId ({
    txBytes
  }: InflightExitModule.IGetInflightExitId): Promise<string> {
    Joi.assert({ txBytes }, Validators.getInFlightExitIdSchema);
    return InflightExitModule.getInFlightExitId.call(this, {
      txBytes
    });
  }

  public async getInFlightExitData ({
    exitIds
  }: InflightExitModule.IGetInflightExitData): Promise<InflightExitModule.IInflightExitData> {
    Joi.assert({ exitIds }, Validators.getInFlightExitDataSchema);
    return InflightExitModule.getInFlightExitData.call(this, {
      exitIds
    });
  }

  public async startStandardExit ({
    utxoPos,
    outputTx,
    inclusionProof,
    transactionOptions
  }: StandardExitModule.IStartStandardExit): Promise<ITransactionReceipt> {
    Joi.assert({ utxoPos, outputTx, inclusionProof, transactionOptions }, Validators.startStandardExitSchema);
    return StandardExitModule.startStandardExit.call(this, {
      utxoPos,
      outputTx,
      inclusionProof,
      transactionOptions
    });
  }

  public async getDepositExitData ({
    transactionHash
  }: StandardExitModule.IGetDepositExitData): Promise<StandardExitModule.IExitData> {
    Joi.assert({ transactionHash }, Validators.getExitDataSchema);
    return StandardExitModule.getDepositExitData.call(this, {
      transactionHash
    });
  }

  public async challengeStandardExit ({
    standardExitId,
    exitingTx,
    challengeTx,
    inputIndex,
    challengeTxSig,
    transactionOptions
  }: StandardExitModule.IChallengeStandardExit): Promise<ITransactionReceipt> {
    Joi.assert({
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      transactionOptions
    }, Validators.challengeStandardExitSchema);
    return StandardExitModule.challengeStandardExit.call(this, {
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      transactionOptions
    });
  }

  public async processExits ({
    token,
    exitId,
    maxExitsToProcess,
    transactionOptions
  }: StandardExitModule.IProcessExits): Promise<ITransactionReceipt> {
    Joi.assert({ token, exitId, maxExitsToProcess, transactionOptions }, Validators.processExitsSchema);
    return StandardExitModule.processExits.call(this, {
      token,
      exitId,
      maxExitsToProcess,
      transactionOptions
    });
  }

}

export default OmgJS;
