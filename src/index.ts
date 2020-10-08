import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { HttpProvider } from 'web3-providers-http';
import * as Joi from '@hapi/joi';

import * as RootchainStandardExitModule from '@lib/rootchain/standardexit';
import * as RootchainInflightExitModule from '@lib/rootchain/inflightexit';
import * as RootchainExitQueueModule from '@lib/rootchain/exitqueue';
import * as RootchainDepositModule from '@lib/rootchain/deposit';
import * as RootchainUtilModule from '@lib/rootchain/util';

import * as WatcherAccountModule from '@lib/watcher/account';
import * as WatcherTransactionModule from '@lib/watcher/transaction';
import * as WatcherFeesModule from '@lib/watcher/fees';
import * as WatcherDepositModule from '@lib/watcher/deposit';
import * as WatcherUtxoModule from '@lib/watcher/utxo';
import * as WatcherStatusModule from '@lib/watcher/status';
import * as WatcherInflightExitModule from '@lib/watcher/inflightexit';

import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';
import * as ContractsModule from '@lib/contracts';
import * as Validators from '@lib/validators';

import PlasmaFrameworkContract from '@lib/contracts/abi/PlasmaFramework.json';

interface IOmgJS {
  plasmaContractAddress: string;
  watcherUrl: string;
  watcherProxyUrl?: string;
  web3Provider: Partial<HttpProvider>;
}

class OmgJS {
  static currency = Constants.CURRENCY_MAP;

  private readonly plasmaContractAddress: string;
  private readonly watcherUrl: string;
  private readonly watcherProxyUrl: string;
  private readonly web3Instance: Web3;
  private readonly plasmaContract: Contract;

  private erc20Vault: ContractsModule.IVault;
  private ethVault: ContractsModule.IVault;
  private paymentExitGame: ContractsModule.IPaymentExitGame;

  public constructor({
    plasmaContractAddress,
    watcherUrl,
    watcherProxyUrl,
    web3Provider
  }: IOmgJS) {
    Joi.assert({
      plasmaContractAddress,
      watcherUrl,
      watcherProxyUrl,
      web3Provider
    }, Validators.constructorSchema);

    this.plasmaContractAddress = plasmaContractAddress;
    this.watcherUrl = watcherUrl;
    this.watcherProxyUrl = watcherProxyUrl;

    this.web3Instance = new (Web3 as any)(web3Provider, null, { transactionConfirmationBlocks: 1 });
    this.plasmaContract = new this.web3Instance.eth.Contract(
      (PlasmaFrameworkContract as any).abi,
      plasmaContractAddress
    );
  }

  private async getErc20Vault (): Promise<ContractsModule.IVault> {
    if (this.erc20Vault) {
      return this.erc20Vault;
    }
    this.erc20Vault = await ContractsModule.getErc20Vault.call(this);
    return this.erc20Vault;
  }

  private async getEthVault (): Promise<ContractsModule.IVault> {
    if (this.ethVault) {
      return this.ethVault;
    }
    this.ethVault = await ContractsModule.getEthVault.call(this);
    return this.ethVault;
  }

  private async getPaymentExitGame (): Promise<ContractsModule.IPaymentExitGame> {
    if (this.paymentExitGame) {
      return this.paymentExitGame;
    }
    this.paymentExitGame = await ContractsModule.getPaymentExitGame.call(this);
    return this.paymentExitGame;
  }

  public async getExitTime ({
    exitRequestBlockNumber,
    submissionBlockNumber
  }: RootchainExitQueueModule.IGetExitTime): Promise<RootchainExitQueueModule.IExitTime> {
    Joi.assert({ exitRequestBlockNumber, submissionBlockNumber }, Validators.getExitTimeSchema);
    return RootchainExitQueueModule.getExitTime.call(this, {
      exitRequestBlockNumber,
      submissionBlockNumber
    });
  }

  public async getExitQueue (token: string): Promise<RootchainExitQueueModule.IExitQueue[]> {
    Joi.assert(token, Validators.getExitQueueSchema);
    return RootchainExitQueueModule.getExitQueue.call(this, token);
  }

  public encodeDeposit ({
    owner,
    amount,
    currency
  }: RootchainDepositModule.IEncodeDeposit): string {
    Joi.assert({ owner, amount, currency }, Validators.encodeDepositSchema);
    return RootchainDepositModule.encodeDeposit.call(this, {
      owner,
      amount,
      currency
    });
  }

  public async approveERC20Deposit ({
    erc20Address,
    amount,
    txOptions
  }: RootchainDepositModule.IApproveDeposit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({ erc20Address, amount, txOptions }, Validators.approveTokenSchema);
    return RootchainDepositModule.approveERC20Deposit.call(this, {
      erc20Address,
      amount,
      txOptions
    });
  }

  public async deposit ({
    amount,
    currency,
    txOptions
  }: RootchainDepositModule.IDeposit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({ amount, currency, txOptions }, Validators.depositSchema);
    return RootchainDepositModule.deposit.call(this, {
      amount,
      currency,
      txOptions
    });
  }

  public async getStandardExitId ({
    txBytes,
    utxoPos,
    isDeposit
  }: RootchainStandardExitModule.IGetStandardExitId): Promise<string> {
    Joi.assert({ txBytes, utxoPos, isDeposit }, Validators.getStandardExitIdSchema);
    return RootchainStandardExitModule.getStandardExitId.call(this, {
      txBytes,
      utxoPos,
      isDeposit
    });
  }

  public async getInFlightExitId ({
    txBytes
  }: RootchainInflightExitModule.IGetInflightExitId): Promise<string> {
    Joi.assert({ txBytes }, Validators.getInFlightExitIdSchema);
    return RootchainInflightExitModule.getInFlightExitId.call(this, {
      txBytes
    });
  }

  public async getInFlightExitData ({
    exitIds
  }: RootchainInflightExitModule.IGetInflightExitData): Promise<RootchainInflightExitModule.IInflightExitData> {
    Joi.assert({ exitIds }, Validators.getInFlightExitDataSchema);
    return RootchainInflightExitModule.getInFlightExitData.call(this, {
      exitIds
    });
  }

  public async startStandardExit ({
    utxoPos,
    outputTx,
    inclusionProof,
    txOptions
  }: RootchainStandardExitModule.IStartStandardExit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({ utxoPos, outputTx, inclusionProof, txOptions }, Validators.startStandardExitSchema);
    return RootchainStandardExitModule.startStandardExit.call(this, {
      utxoPos,
      outputTx,
      inclusionProof,
      txOptions
    });
  }

  public async getDepositExitData ({
    transactionHash
  }: RootchainStandardExitModule.IGetDepositExitData): Promise<RootchainStandardExitModule.IExitData> {
    Joi.assert({ transactionHash }, Validators.getExitDataSchema);
    return RootchainStandardExitModule.getDepositExitData.call(this, {
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
  }: RootchainStandardExitModule.IChallengeStandardExit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      standardExitId,
      exitingTx,
      challengeTx,
      inputIndex,
      challengeTxSig,
      txOptions
    }, Validators.challengeStandardExitSchema);
    return RootchainStandardExitModule.challengeStandardExit.call(this, {
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
  }: RootchainExitQueueModule.IProcessExits): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({ token, exitId, maxExitsToProcess, txOptions }, Validators.processExitsSchema);
    return RootchainExitQueueModule.processExits.call(this, {
      token,
      exitId,
      maxExitsToProcess,
      txOptions
    });
  }

  public async hasExitQueue (token: string): Promise<boolean> {
    Joi.assert(token, Validators.hasExitQueueSchema);
    return RootchainExitQueueModule.hasExitQueue.call(this, token);
  } 

  public async addExitQueue ({
    token,
    txOptions
  }: RootchainExitQueueModule.IAddExitQueue): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({ token, txOptions }, Validators.addExitQueueSchema);
    return RootchainExitQueueModule.addExitQueue.call(this, {
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
  }: RootchainInflightExitModule.IStartInflightExit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inputTxs,
      inputUtxosPos,
      inputTxsInclusionProofs,
      inFlightTxSigs,
      txOptions
    }, Validators.startInFlightExitSchema);
    return RootchainInflightExitModule.startInflightExit.call(this, {
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
  }: RootchainInflightExitModule.IPiggybackInflightExitOnOutput): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      outputIndex,
      txOptions
    }, Validators.piggybackInFlightExitOnOutputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnOutput.call(this, {
      inFlightTx,
      outputIndex,
      txOptions
    });
  }

  public async piggybackInFlightExitOnInput ({
    inFlightTx,
    inputIndex,
    txOptions
  }: RootchainInflightExitModule.IPiggybackInflightExitOnInput): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inputIndex,
      txOptions
    }, Validators.piggybackInFlightExitOnInputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnInput.call(this, {
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
  }: RootchainInflightExitModule.IChallengeInflightExitNotCanonical): Promise<Interfaces.ITransactionReceipt> {
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
    return RootchainInflightExitModule.challengeInFlightExitNotCanonical.call(this, {
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
  }: RootchainInflightExitModule.IRespondToNonCanonicalChallenge): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inFlightTxPos,
      inFlightTxInclusionProof,
      txOptions
    }, Validators.respondToNonCanonicalChallengeSchema);
    return RootchainInflightExitModule.respondToNonCanonicalChallenge.call(this, {
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
  }: RootchainInflightExitModule.IChallengeInFlightExitInputSpent): Promise<Interfaces.ITransactionReceipt> {
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
    return RootchainInflightExitModule.challengeInFlightExitInputSpent.call(this, {
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
  }: RootchainInflightExitModule.IChallengeInFlightExitOutputSpent): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      inFlightTx,
      inFlightTxInclusionProof,
      inFlightTxOutputPos,
      challengingTx,
      challengingTxInputIndex,
      challengingTxWitness,
      txOptions
    }, Validators.challengeInFlightExitOutputSpentSchema);
    return RootchainInflightExitModule.challengeInFlightExitOutputSpent.call(this, {
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
  }: RootchainInflightExitModule.IDeleteNonPiggybackedInFlightExit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      exitId,
      txOptions
    }, Validators.deleteNonPiggybackedInFlightExitSchema);
    return RootchainInflightExitModule.deleteNonPiggybackedInFlightExit.call(this, {
      exitId,
      txOptions
    });
  }

  public async getUtxos (address: string): Promise<Array<Interfaces.IUTXO>> {
    Joi.assert(address, Validators.getUtxosSchema);
    return WatcherAccountModule.getUtxos.call(this, address);
  }

  public async getBalance (address: string): Promise<Interfaces.IBalance> {
    Joi.assert(address, Validators.getBalanceSchema);
    return WatcherAccountModule.getBalance.call(this, address);
  }

  public async getTransaction (id: string): Promise<Interfaces.ITransactionData> {
    Joi.assert({ id }, Validators.getTransactionSchema);
    return WatcherTransactionModule.getTransaction.call(this, id);
  }

  public async getTransactions (filters: Interfaces.ITransactionFilter): Promise<Array<Interfaces.ITransactionData>> {
    Joi.assert(filters, Validators.getTransactionsSchema);
    return WatcherTransactionModule.getTransactions.call(this, filters);
  }

  public async getFees (): Promise<Interfaces.IFeeInfo> {
    return WatcherFeesModule.getFees.call(this);
  }

  public async getDeposits (filters: Interfaces.IDepositFilter): Promise<Array<Interfaces.IDepositInfo>> {
    Joi.assert(filters, Validators.getDepositsSchema);
    return WatcherDepositModule.getDeposits.call(this, filters);
  }

  public async getExitData (utxo: Interfaces.IUTXO): Promise<Interfaces.IExitData> {
    Joi.assert(utxo, Validators.getExitDataSchema);
    return WatcherUtxoModule.getExitData.call(this, utxo);
  }

  public async getChallengeData (utxoPos: number): Promise<Interfaces.IChallengeData> {
    Joi.assert({ utxoPos }, Validators.getChallengeDataSchema);
    return WatcherUtxoModule.getChallengeData.call(this, utxoPos);
  }

  // NMTODO: add missing childchain signing methods

  public async createTransaction ({
    owner,
    payments,
    fee,
    metadata
  }: WatcherTransactionModule.ICreateTransaction): Promise<WatcherTransactionModule.ICreatedTransactions> {
    Joi.assert({
      owner,
      payments,
      fee,
      metadata
    }, Validators.createTransactionSchema);
    return WatcherTransactionModule.createTransaction.call(this, {
      owner,
      payments,
      fee,
      metadata
    });
  }

  public async getStatus (): Promise<WatcherStatusModule.IStatus> {
    return WatcherStatusModule.getStatus.call(this);
  }

  public async inFlightExitGetInputChallengeData ({
    txbytes,
    inputIndex
  }: WatcherInflightExitModule.IInFlightExitGetInputChallengeData): Promise<WatcherInflightExitModule.IInflightExitInputChallengeData> {
    Joi.assert({
      txbytes,
      inputIndex
    }, Validators.inFlightExitGetInputChallengeDataSchema);
    return WatcherInflightExitModule.inFlightExitGetInputChallengeData.call(this, {
      txbytes,
      inputIndex
    });
  }

  public async inFlightExitGetOutputChallengeData ({
    txbytes,
    outputIndex
  }: WatcherInflightExitModule.IInFlightExitGetOutputChallengeData): Promise<WatcherInflightExitModule.IInflightExitOutputChallengeData> {
    Joi.assert({
      txbytes,
      outputIndex
    }, Validators.inFlightExitGetOutputChallengeDataSchema);
    return WatcherInflightExitModule.inFlightExitGetOutputChallengeData.call(this, {
      txbytes,
      outputIndex      
    });
  }

  public async inFlightExitGetData (txbytes: string): Promise<Interfaces.IExitData> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetData.call(this, txbytes);
  }

  public async inFlightExitGetCompetitor (txbytes: string): Promise<WatcherInflightExitModule.IInflightExitCompetitor> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetCompetitor.call(this, txbytes);
  }

  public async inFlightExitProveCanonical (txbytes: string): Promise<string> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitProveCanonical.call(this, txbytes);
  }

  public async getEVMErrorReason (txHash: string): Promise<string> {
    Joi.assert(txHash, Joi.string().required());
    return RootchainUtilModule.getEVMErrorReason.call(this, txHash);
  }

  public async getRootchainERC20Balance ({
    address,
    erc20Address
  }: RootchainUtilModule.IGetRootchainERC20Balance): Promise<string> {
    Joi.assert({
      address,
      erc20Address
    }, Validators.getErc20BalanceSchema);
    return RootchainUtilModule.getRootchainERC20Balance.call(this, {
      address,
      erc20Address
    });
  }

  public async waitForRootchainTransaction ({
    transactionHash,
    checkIntervalMs,
    blocksToWait,
    onCountdown
  }: RootchainUtilModule.IWaitForRootchainTransaction): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert({
      transactionHash,
      checkIntervalMs,
      blocksToWait,
      onCountdown
    }, Validators.waitForRootchainTransactionSchema);
    return RootchainUtilModule.waitForRootchainTransaction.call(this, {
      transactionHash,
      checkIntervalMs,
      blocksToWait,
      onCountdown
    });
  }

  public async waitForChildchainBalance ({
    address,
    expectedAmount,
    currency
  }: RootchainUtilModule.IWaitForChildchainBalance): Promise<Array<Interfaces.IBalance>> {
    Joi.assert({
      address,
      expectedAmount,
      currency
    }, Validators.waitForChildchainBalanceSchema);
    return RootchainUtilModule.waitForChildchainBalance.call(this, {
      address,
      expectedAmount,
      currency
    });
  }
}

export default OmgJS;
