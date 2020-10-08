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
    txOptions
  }: DepositModule.IApproveDeposit): Promise<ITransactionReceipt> {
    Joi.assert({ erc20Address, amount, txOptions }, Validators.approveTokenSchema);
    return DepositModule.approveERC20Deposit.call(this, {
      erc20Address,
      amount,
      txOptions
    });
  }

  public async deposit ({
    amount,
    currency,
    txOptions
  }: DepositModule.IDeposit): Promise<ITransactionReceipt> {
    Joi.assert({ amount, currency, txOptions }, Validators.depositSchema);
    return DepositModule.deposit.call(this, {
      amount,
      currency,
      txOptions
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
    txOptions
  }: StandardExitModule.IStartStandardExit): Promise<ITransactionReceipt> {
    Joi.assert({ utxoPos, outputTx, inclusionProof, txOptions }, Validators.startStandardExitSchema);
    return StandardExitModule.startStandardExit.call(this, {
      utxoPos,
      outputTx,
      inclusionProof,
      txOptions
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
    txOptions
  }: StandardExitModule.IChallengeStandardExit): Promise<ITransactionReceipt> {
    Joi.assert({
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      txOptions
    }, Validators.challengeStandardExitSchema);
    return StandardExitModule.challengeStandardExit.call(this, {
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      txOptions
    });
  }

  public async processExits ({
    token,
    exitId,
    maxExitsToProcess,
    txOptions
  }: ExitQueueModule.IProcessExits): Promise<ITransactionReceipt> {
    Joi.assert({ token, exitId, maxExitsToProcess, txOptions }, Validators.processExitsSchema);
    return ExitQueueModule.processExits.call(this, {
      token,
      exitId,
      maxExitsToProcess,
      txOptions
    });
  }

  public async hasExitQueue (token: string): Promise<boolean> {
    Joi.assert(token, Validators.hasExitQueueSchema);
    return ExitQueueModule.hasExitQueue.call(this, token);
  } 

  public async addExitQueue ({
    token,
    txOptions
  }: ExitQueueModule.IAddExitQueue): Promise<ITransactionReceipt> {
    Joi.assert({ token, txOptions }, Validators.addExitQueueSchema);
    return ExitQueueModule.addExitQueue.call(this, {
      token,
      txOptions
    });
  }

  public async startInFlightExit ({
    inFlightTx,
    inputTxs,
    inputUtxosPos,
    inputTxsInclusionProofs,
    inFlightTxSigs,
    txOptions
  }: InflightExitModule.IStartInflightExit): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inputTxs,
      inputUtxosPos,
      inputTxsInclusionProofs,
      inFlightTxSigs,
      txOptions
    }, Validators.startInFlightExitSchema);
    return InflightExitModule.startInflightExit.call(this, {
      inFlightTx,
      inputTxs,
      inputUtxosPos,
      inputTxsInclusionProofs,
      inFlightTxSigs,
      txOptions
    });
  }

  public async piggybackInFlightExitOnOutput ({
    inFlightTx,
    outputIndex,
    txOptions
  }: InflightExitModule.IPiggybackInflightExitOnOutput): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      outputIndex,
      txOptions
    }, Validators.piggybackInFlightExitOnOutputSchema);
    return InflightExitModule.piggybackInFlightExitOnOutput.call(this, {
      inFlightTx,
      outputIndex,
      txOptions
    });
  }

  public async piggybackInFlightExitOnInput ({
    inFlightTx,
    inputIndex,
    txOptions
  }: InflightExitModule.IPiggybackInflightExitOnInput): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inputIndex,
      txOptions
    }, Validators.piggybackInFlightExitOnInputSchema);
    return InflightExitModule.piggybackInFlightExitOnInput.call(this, {
      inFlightTx,
      inputIndex,
      txOptions
    });
  }

  public async challengeInFlightExitNotCanonical ({
    inputTx,
    inputUtxoPos,
    inFlightTx,
    inFlightTxInputIndex,
    competingTx,
    competingTxInputIndex,
    competingTxPos,
    competingTxInclusionProof,
    competingTxWitness,
    txOptions
  }: InflightExitModule.IChallengeInflightExitNotCanonical): Promise<ITransactionReceipt> {
    Joi.assert({
      inputTx,
      inputUtxoPos,
      inFlightTx,
      inFlightTxInputIndex,
      competingTx,
      competingTxInputIndex,
      competingTxPos,
      competingTxInclusionProof,
      competingTxWitness,
      txOptions
    }, Validators.challengeInFlightExitNotCanonicalSchema);
    return InflightExitModule.challengeInFlightExitNotCanonical.call(this, {
      inputTx,
      inputUtxoPos,
      inFlightTx,
      inFlightTxInputIndex,
      competingTx,
      competingTxInputIndex,
      competingTxPos,
      competingTxInclusionProof,
      competingTxWitness,
      txOptions
    });
  }

  public async respondToNonCanonicalChallenge ({
    inFlightTx,
    inFlightTxPos,
    inFlightTxInclusionProof,
    txOptions
  }: InflightExitModule.IRespondToNonCanonicalChallenge): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inFlightTxPos,
      inFlightTxInclusionProof,
      txOptions
    }, Validators.respondToNonCanonicalChallengeSchema);
    return InflightExitModule.respondToNonCanonicalChallenge.call(this, {
      inFlightTx,
      inFlightTxPos,
      inFlightTxInclusionProof,
      txOptions
    });
  }

  public async challengeInFlightExitInputSpent ({
    inFlightTx,
    inFlightTxInputIndex,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    inputTx,
    inputUtxoPos,
    txOptions
  }: InflightExitModule.IChallengeInFlightExitInputSpent): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inFlightTxInputIndex,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      inputTx,
      inputUtxoPos,
      txOptions
    }, Validators.challengeInFlightExitInputSpentSchema);
    return InflightExitModule.challengeInFlightExitInputSpent.call(this, {
      inFlightTx,
      inFlightTxInputIndex,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      inputTx,
      inputUtxoPos,
      txOptions
    });
  }

  public async challengeInFlightExitOutputSpent ({
    inFlightTx,
    inFlightTxInclusionProof,
    inFlightTxOutputPos,
    challengingTx,
    challengingTxInputIndex,
    challengingTxWitness,
    txOptions
  }: InflightExitModule.IChallengeInFlightExitOutputSpent): Promise<ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inFlightTxInclusionProof,
      inFlightTxOutputPos,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      txOptions
    }, Validators.challengeInFlightExitOutputSpentSchema);
    return InflightExitModule.challengeInFlightExitOutputSpent.call(this, {
      inFlightTx,
      inFlightTxInclusionProof,
      inFlightTxOutputPos,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      txOptions
    });
  }

  public async deleteNonPiggybackedInFlightExit ({
    exitId,
    txOptions
  }: InflightExitModule.IDeleteNonPiggybackedInFlightExit): Promise<ITransactionReceipt> {
    Joi.assert({
      exitId,
      txOptions
    }, Validators.deleteNonPiggybackedInFlightExitSchema);
    return InflightExitModule.deleteNonPiggybackedInFlightExit.call(this, {
      exitId,
      txOptions
    });
  }
}

export default OmgJS;
