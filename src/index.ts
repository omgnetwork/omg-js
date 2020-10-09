import Web3 from 'web3';
import BN from 'bn.js';
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

import * as EncoderModule from '@lib/transaction/encoders';
import * as TypedDataModule from '@lib/transaction/typedData';
import * as StructHashModule from '@lib/transaction/structHash';
import * as TransactionBuilderModule from '@lib/transaction/txBuilder';

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

/**
 * Instantiate an OmgJS object to interact with the OMG Network
 * 
 * ```ts
 * const omgjs = new OmgJS({
 *  plasmaContractAddress: '0x123',
 *  watcherUrl: 'https://watcherurl',
 *  web3Provider: new Web3.providers.HTTPProvider(eth_node);
 * });
 * ```
 * */
class OmgJS {
  /**
   * Helper currency map to easily access certain addresses
   */
  public static currency = Constants.CURRENCY_MAP;

  private readonly plasmaContractAddress: string;
  private readonly watcherUrl: string;
  private readonly watcherProxyUrl: string;
  private readonly web3Instance: Web3;
  private readonly plasmaContract: Contract;

  private erc20Vault: ContractsModule.IVault;
  private ethVault: ContractsModule.IVault;
  private paymentExitGame: ContractsModule.IPaymentExitGame;

  /**
   * @param plasmaContractAddress the address of the PlasmaFramework contract
   * @param watcherUrl the url of the watcher-info server (running in both security-critical and informational mode)
   * @param watcherProxyUrl *optional* the proxy url for requests made to the watcher server
   * @param web3Provider a web3 http provider
   */
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

  /** Calculate the exit schedule required before exits can be processed and released */
  public async getExitTime (
    args: RootchainExitQueueModule.IGetExitTime
  ): Promise<RootchainExitQueueModule.IExitTime> {
    Joi.assert(args, Validators.getExitTimeSchema);
    return RootchainExitQueueModule.getExitTime.call(this, args);
  }

  /** Retrieve the exit queue for a particular currency */
  public async getExitQueue (
    currency: string
  ): Promise<RootchainExitQueueModule.IExitQueue[]> {
    Joi.assert(currency, Validators.getExitQueueSchema);
    return RootchainExitQueueModule.getExitQueue.call(this, currency);
  }

  /** Create and encodes a deposit transaction */
  public encodeDeposit (
    args: EncoderModule.IDepositTransaction
  ): string {
    Joi.assert(args, Validators.encodeDepositSchema);
    return EncoderModule.encodeDeposit.call(this, args);
  }

  /** Decode a RLP encoded deposit transaction */
  public decodeDeposit (
    encodedDeposit: string
  ): EncoderModule.IDepositTransaction {
    Joi.assert(encodedDeposit, Joi.string().required());
    return EncoderModule.decodeDeposit.call(this, encodedDeposit);
  }

  /** RLP encode a transaction */
  public encodeTransaction (
    args: EncoderModule.IEncodeTransaction
  ): string {
    Joi.assert(args, Validators.encodeTransactionSchema);
    return EncoderModule.encodeTransaction.call(this, args);
  }

  /** Decode a RLP encoded transaction */
  public decodeTransaction (
    encodedTransaction: string
  ): Interfaces.ITransactionBody {
    Joi.assert(encodedTransaction, Joi.string().required());
    return EncoderModule.decodeTransaction.call(this, encodedTransaction);
  }

  /** Encode a UTXO */
  public encodeUtxoPos (
    utxo: Interfaces.IUTXO
  ): BN {
    Joi.assert({ utxo }, Validators.encodeUtxoPosSchema);
    return EncoderModule.encodeUtxoPos.call(this, utxo);
  }

  /** Decode an encoded UTXO */
  public decodeUtxoPos (
    utxoPos: Interfaces.IComplexAmount
  ): Partial<Interfaces.IUTXO> {
    Joi.assert({ utxoPos }, Validators.decodeUtxoPosSchema);
    return EncoderModule.decodeUtxoPos.call(this, utxoPos);
  }

  /** Encode metadata */
  public encodeMetadata (
    metadata: string
  ): string {
    Joi.assert({ metadata }, Validators.encodeMetadataSchema);
    return EncoderModule.encodeMetadata.call(this, metadata);
  }

  /** Decode encoded metadata */
  public decodeMetadata (
    metadata: string
  ): string {
    Joi.assert({ metadata }, Validators.decodeMetadataSchema);
    return EncoderModule.decodeMetadata.call(this, metadata);
  }

  /** Approve an ERC20 for deposit into the OMG Network */
  public async approveERC20Deposit (
    args: RootchainDepositModule.IApproveDeposit
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.approveERC20DepositSchema);
    return RootchainDepositModule.approveERC20Deposit.call(this, args);
  }

  /** Deposit funds into the OMG Network */
  public async deposit (
    args: RootchainDepositModule.IDeposit
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.depositSchema);
    return RootchainDepositModule.deposit.call(this, args);
  }

  /** Get a standard exit id to process a standard exit */
  public async getStandardExitId (
    args: RootchainStandardExitModule.IGetStandardExitId
  ): Promise<string> {
    Joi.assert(args, Validators.getStandardExitIdSchema);
    return RootchainStandardExitModule.getStandardExitId.call(this, args);
  }

  /** Get an inflight exit id to process an inflight exit */
  public async getInFlightExitId (
    args: RootchainInflightExitModule.IGetInflightExitId
  ): Promise<string> {
    Joi.assert(args, Validators.getInFlightExitIdSchema);
    return RootchainInflightExitModule.getInFlightExitId.call(this, args);
  }

  /** Retrieve in-flight exit data from an array of exit IDs */
  public async getInFlightExitData (
    args: RootchainInflightExitModule.IGetInflightExitData
  ): Promise<RootchainInflightExitModule.IInflightExitData> {
    Joi.assert(args, Validators.getInFlightExitDataSchema);
    return RootchainInflightExitModule.getInFlightExitData.call(this, args);
  }

  /** Start a standard withdrawal of a given output. Uses output-age priority */
  public async startStandardExit (
    args: RootchainStandardExitModule.IStartStandardExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.startStandardExitSchema);
    return RootchainStandardExitModule.startStandardExit.call(this, args);
  }

  /** Get the exit data for a deposit without using the Watcher */
  public async getDepositExitData (
    args: RootchainStandardExitModule.IGetDepositExitData
  ): Promise<Interfaces.IExitData> {
    Joi.assert(args, Validators.getExitDataSchema);
    return RootchainStandardExitModule.getDepositExitData.call(this, args);
  }

  /** Block a standard exit by showing the exiting output was spent */
  public async challengeStandardExit (args: RootchainStandardExitModule.IChallengeStandardExit): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.challengeStandardExitSchema);
    return RootchainStandardExitModule.challengeStandardExit.call(this, args);
  }

  /** Processes any exit that has completed the challenge period */
  public async processExits (
    args: RootchainExitQueueModule.IProcessExits
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.processExitsSchema);
    return RootchainExitQueueModule.processExits.call(this, args);
  }

  /** Check if an exit queue exists for this currency */
  public async hasExitQueue (
    currency: string
  ): Promise<boolean> {
    Joi.assert(currency, Validators.hasExitQueueSchema);
    return RootchainExitQueueModule.hasExitQueue.call(this, currency);
  } 

  /** Adds an exit queue to the OMG Network */
  public async addExitQueue (
    args: RootchainExitQueueModule.IAddExitQueue
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.addExitQueueSchema);
    return RootchainExitQueueModule.addExitQueue.call(this, args);
  }

  /** Start an exit for an in-flight transaction */
  public async startInFlightExit (
    args: RootchainInflightExitModule.IStartInflightExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.startInFlightExitSchema);
    return RootchainInflightExitModule.startInflightExit.call(this, args);
  }

  /** Piggyback onto an output of an in-flight transaction */
  public async piggybackInFlightExitOnOutput (
    args: RootchainInflightExitModule.IPiggybackInflightExitOnOutput
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.piggybackInFlightExitOnOutputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnOutput.call(this, args);
  }

  /** Piggyback onto an input of an in-flight transaction */
  public async piggybackInFlightExitOnInput (
    args: RootchainInflightExitModule.IPiggybackInflightExitOnInput
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.piggybackInFlightExitOnInputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnInput.call(this, args);
  }

  /** Prove that an in-flight exit is not canonical */
  public async challengeInFlightExitNotCanonical (
    args: RootchainInflightExitModule.IChallengeInflightExitNotCanonical
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.challengeInFlightExitNotCanonicalSchema);
    return RootchainInflightExitModule.challengeInFlightExitNotCanonical.call(this, args);
  }

  /** Respond to competitors of an in-flight exit by showing the transaction is included */
  public async respondToNonCanonicalChallenge (
    args: RootchainInflightExitModule.IRespondToNonCanonicalChallenge
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.respondToNonCanonicalChallengeSchema);
    return RootchainInflightExitModule.respondToNonCanonicalChallenge.call(this, args);
  }

  /** Remove an input from list of exitable outputs in an in-flight transaction */
  public async challengeInFlightExitInputSpent (
    args: RootchainInflightExitModule.IChallengeInFlightExitInputSpent
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.challengeInFlightExitInputSpentSchema);
    return RootchainInflightExitModule.challengeInFlightExitInputSpent.call(this, args);
  }

  /** Remove an output from list of exitable outputs in an in-flight transaction */
  public async challengeInFlightExitOutputSpent (
    args: RootchainInflightExitModule.IChallengeInFlightExitOutputSpent
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.challengeInFlightExitOutputSpentSchema);
    return RootchainInflightExitModule.challengeInFlightExitOutputSpent.call(this, args);
  }

  /** Delete an in-flight exit if the first phase has passed and nobody has piggybacked the exit */
  public async deleteNonPiggybackedInFlightExit (
    args: RootchainInflightExitModule.IDeleteNonPiggybackedInFlightExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Joi.assert(args, Validators.deleteNonPiggybackedInFlightExitSchema);
    return RootchainInflightExitModule.deleteNonPiggybackedInFlightExit.call(this, args);
  }

  public async getUtxos (
    address: string
  ): Promise<Array<Interfaces.IUTXO>> {
    Joi.assert(address, Validators.getUtxosSchema);
    return WatcherAccountModule.getUtxos.call(this, address);
  }

  public async getBalance (
    address: string
  ): Promise<WatcherAccountModule.IBalance> {
    Joi.assert(address, Validators.getBalanceSchema);
    return WatcherAccountModule.getBalance.call(this, address);
  }

  public async getTransaction (
    id: string
  ): Promise<Interfaces.ITransactionData> {
    Joi.assert({ id }, Validators.getTransactionSchema);
    return WatcherTransactionModule.getTransaction.call(this, id);
  }

  public async getTransactions (
    filters: WatcherTransactionModule.ITransactionFilter
  ): Promise<Array<Interfaces.ITransactionData>> {
    Joi.assert(filters, Validators.getTransactionsSchema);
    return WatcherTransactionModule.getTransactions.call(this, filters);
  }

  public async getFees (): Promise<WatcherFeesModule.IFeeInfo> {
    return WatcherFeesModule.getFees.call(this);
  }

  public async getDeposits (
    filters: WatcherDepositModule.IDepositFilter
  ): Promise<Array<WatcherDepositModule.IDepositInfo>> {
    Joi.assert(filters, Validators.getDepositsSchema);
    return WatcherDepositModule.getDeposits.call(this, filters);
  }

  public async getExitData (
    utxo: Interfaces.IUTXO
  ): Promise<Interfaces.IExitData> {
    Joi.assert(utxo, Validators.getExitDataSchema);
    return WatcherUtxoModule.getExitData.call(this, utxo);
  }

  public async getChallengeData (
    utxoPos: number
  ): Promise<WatcherUtxoModule.IChallengeData> {
    Joi.assert({ utxoPos }, Validators.getChallengeDataSchema);
    return WatcherUtxoModule.getChallengeData.call(this, utxoPos);
  }

  // NMTODO: add missing childchain signing methods

  public async createTransaction ({
    owner,
    payments,
    feeCurrency,
    metadata
  }: WatcherTransactionModule.ICreateTransaction): Promise<WatcherTransactionModule.ICreatedTransactions> {
    Joi.assert({
      owner,
      payments,
      feeCurrency,
      metadata
    }, Validators.createTransactionSchema);
    return WatcherTransactionModule.createTransaction.call(this, {
      owner,
      payments,
      feeCurrency,
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

  public async inFlightExitGetData (
    txbytes: string
  ): Promise<Interfaces.IExitData> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetData.call(this, txbytes);
  }

  public async inFlightExitGetCompetitor (
    txbytes: string
  ): Promise<WatcherInflightExitModule.IInflightExitCompetitor> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetCompetitor.call(this, txbytes);
  }

  public async inFlightExitProveCanonical (
    txbytes: string
  ): Promise<string> {
    Joi.assert(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitProveCanonical.call(this, txbytes);
  }

  public async getEVMErrorReason (
    txHash: string
  ): Promise<string> {
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
  }: RootchainUtilModule.IWaitForChildchainBalance): Promise<Array<WatcherAccountModule.IBalance>> {
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

  public hashTypedData (
    typedData: TypedDataModule.ITypedData
  ): Buffer {
    Joi.assert({ typedData }, Validators.hashTypedDataSchema);
    return StructHashModule.hashTypedData.call(this, typedData);
  }

  public getTypedData (
    transactionBody: Interfaces.ITransactionBody
  ): TypedDataModule.ITypedData {
    Joi.assert({ transactionBody }, Validators.getTypedDataSchema);
    return TypedDataModule.getTypedData.call(this, transactionBody);
  }

  public getTypedDataArray (
    typedDataMessage: TypedDataModule.ITypedDataMessage
  ): Array<any> {
    return EncoderModule.getTypedDataArray.call(this, typedDataMessage);
  }

  public createTransactionBody ({
    fromAddress,
    fromUtxos,
    payments,
    fee,
    metadata
  }: TransactionBuilderModule.ICreateTransactionBody): Partial<Interfaces.ITransactionBody> {
    Joi.assert({
      fromAddress,
      fromUtxos,
      payments,
      fee,
      metadata
    }, Validators.createTransactionBodySchema);
    return TransactionBuilderModule.createTransactionBody.call(this, {
      fromAddress,
      fromUtxos,
      payments,
      fee,
      metadata
    });
  }
}

export default OmgJS;
