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
import * as SignModule from '@lib/transaction/sign';

import * as Util from '@lib/common/util';
import * as Constants from '@lib/common/constants';
import * as Interfaces from '@lib/common/interfaces';
import * as ContractsModule from '@lib/contracts';
import * as Validators from '@lib/validators';

import PlasmaFrameworkContract from '@lib/contracts/abi/PlasmaFramework.json';

interface IOmgJS {
  plasmaContractAddress: string;
  watcherUrl: string;
  watcherSecurityUrl?: string;
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
  /** Helper currency map */
  public static currency = Constants.CURRENCY_MAP;

  /** Utility functions */
  public static util = {
    prefixHex: Util.prefixHex,
    int192toHex: Util.int192toHex
  };

  public readonly web3Instance: Web3;

  private readonly plasmaContractAddress: string;
  private readonly watcherUrl: string;
  private readonly watcherSecurityUrl: string;
  private readonly watcherProxyUrl: string;
  private readonly plasmaContract: Contract;
  
  private erc20Vault: ContractsModule.IVault;
  private ethVault: ContractsModule.IVault;
  private paymentExitGame: ContractsModule.IPaymentExitGame;

  /**
   * @param args.plasmaContractAddress the address of the PlasmaFramework contract
   * @param args.watcherUrl the url of the watcher-info server (running in both security-critical and informational mode)
   * @param args.web3Provider a web3 http provider
   * @param args.watcherSecurityUrl the url of the watcher security server. If this is set, all security related endpoints will use this url instead
   * @param args.watcherProxyUrl the proxy url for requests made to the watcher server
   */
  public constructor(args: IOmgJS) {
    Validators.validate(args, Validators.constructorSchema);

    this.plasmaContractAddress = args.plasmaContractAddress;
    this.watcherUrl = args.watcherUrl;
    this.watcherSecurityUrl = args.watcherSecurityUrl || args.watcherUrl;
    this.watcherProxyUrl = args.watcherProxyUrl;
    this.web3Instance = new (Web3 as any)(args.web3Provider, null, { transactionConfirmationBlocks: 1 });
    this.plasmaContract = new this.web3Instance.eth.Contract(
      (PlasmaFrameworkContract as any).abi,
      args.plasmaContractAddress
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

  /** Get the minimum exit period set on the plasma framework contract */
  public async getMinimumExitPeriod (): Promise<string> {
    return RootchainUtilModule.getMinimumExitPeriod.call(this);
  }

  /** Calculate the exit schedule required before exits can be processed and released */
  public async getExitTime (
    args: RootchainExitQueueModule.IGetExitTime
  ): Promise<RootchainExitQueueModule.IExitTime> {
    Validators.validate(args, Validators.getExitTimeSchema);
    return RootchainExitQueueModule.getExitTime.call(this, args);
  }

  /** Retrieve the exit queue for a particular currency */
  public async getExitQueue (
    currency: string
  ): Promise<RootchainExitQueueModule.IExitQueue[]> {
    Validators.validate(currency, Validators.getExitQueueSchema);
    return RootchainExitQueueModule.getExitQueue.call(this, currency);
  }

  /** Create and encodes a deposit transaction */
  public encodeDeposit (
    args: EncoderModule.IDepositTransaction
  ): string {
    Validators.validate(args, Validators.encodeDepositSchema);
    return EncoderModule.encodeDeposit.call(this, args);
  }

  /** Decode a RLP encoded deposit transaction */
  public decodeDeposit (
    encodedDeposit: string
  ): EncoderModule.IDepositTransaction {
    Validators.validate(encodedDeposit, Joi.string().required());
    return EncoderModule.decodeDeposit.call(this, encodedDeposit);
  }

  /** RLP encode a transaction */
  public encodeTransaction (
    args: EncoderModule.IEncodeTransaction
  ): string {
    Validators.validate(args, Validators.encodeTransactionSchema);
    return EncoderModule.encodeTransaction.call(this, args);
  }

  /** Decode a RLP encoded transaction */
  public decodeTransaction (
    encodedTransaction: string
  ): Interfaces.ITransactionBody {
    Validators.validate(encodedTransaction, Joi.string().required());
    return EncoderModule.decodeTransaction.call(this, encodedTransaction);
  }

  /** Encode a UTXO */
  public encodeUtxoPos (
    utxo: Interfaces.IUTXO
  ): BN {
    Validators.validate({ utxo }, Validators.encodeUtxoPosSchema);
    return EncoderModule.encodeUtxoPos.call(this, utxo);
  }

  /** Decode an encoded UTXO */
  public decodeUtxoPos (
    utxoPos: Interfaces.IComplexAmount
  ): Partial<Interfaces.IUTXO> {
    Validators.validate({ utxoPos }, Validators.decodeUtxoPosSchema);
    return EncoderModule.decodeUtxoPos.call(this, utxoPos);
  }

  /** Encode metadata */
  public encodeMetadata (
    metadata: string
  ): string {
    Validators.validate({ metadata }, Validators.encodeMetadataSchema);
    return EncoderModule.encodeMetadata.call(this, metadata);
  }

  /** Decode encoded metadata */
  public decodeMetadata (
    metadata: string
  ): string {
    Validators.validate({ metadata }, Validators.decodeMetadataSchema);
    return EncoderModule.decodeMetadata.call(this, metadata);
  }

  /**
   * Approve an ERC20 for deposit into the OMG Network
   * @param args.amount amount to approve
   * @param args.erc20Address address of the ERC20 token
   * @param args.txOptions transaction options
  */
  public async approveERC20Deposit (
    args: RootchainDepositModule.IApproveDeposit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.approveERC20DepositSchema);
    return RootchainDepositModule.approveERC20Deposit.call(this, args);
  }

  /**
   * Deposit funds into the OMG Network
   * @param args.amount amount to deposit
   * @param args.currency if depositing an ERC20, the address of the ERC20 token
   * @param args.txOptions transaction options
   */
  public async deposit (
    args: RootchainDepositModule.IDeposit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.depositSchema);
    return RootchainDepositModule.deposit.call(this, args);
  }

  /** Get a standard exit id to process a standard exit */
  public async getStandardExitId (
    args: RootchainStandardExitModule.IGetStandardExitId
  ): Promise<string> {
    Validators.validate(args, Validators.getStandardExitIdSchema);
    return RootchainStandardExitModule.getStandardExitId.call(this, args);
  }

  /** Get an inflight exit id to process an inflight exit */
  public async getInFlightExitId (
    args: RootchainInflightExitModule.IGetInflightExitId
  ): Promise<string> {
    Validators.validate(args, Validators.getInFlightExitIdSchema);
    return RootchainInflightExitModule.getInFlightExitId.call(this, args);
  }

  /** Retrieve in-flight exit data from an array of exit IDs */
  public async getInFlightExitData (
    args: RootchainInflightExitModule.IGetInflightExitData
  ): Promise<RootchainInflightExitModule.IInflightExitData> {
    Validators.validate(args, Validators.getInFlightExitDataSchema);
    return RootchainInflightExitModule.getInFlightExitData.call(this, args);
  }

  /** Start a standard withdrawal of a given output. Uses output-age priority */
  public async startStandardExit (
    args: RootchainStandardExitModule.IStartStandardExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.startStandardExitSchema);
    return RootchainStandardExitModule.startStandardExit.call(this, args);
  }

  /** Get the exit data for a deposit without using the Watcher */
  public async getDepositExitData (
    args: RootchainStandardExitModule.IGetDepositExitData
  ): Promise<Interfaces.IExitData> {
    Validators.validate(args, Validators.getDepositExitDataSchema);
    return RootchainStandardExitModule.getDepositExitData.call(this, args);
  }

  /** Block a standard exit by showing the exiting output was spent */
  public async challengeStandardExit (
    args: RootchainStandardExitModule.IChallengeStandardExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.challengeStandardExitSchema);
    return RootchainStandardExitModule.challengeStandardExit.call(this, args);
  }

  /** Processes any exit that has completed the challenge period */
  public async processExits (
    args: RootchainExitQueueModule.IProcessExits
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.processExitsSchema);
    return RootchainExitQueueModule.processExits.call(this, args);
  }

  /** Check if an exit queue exists for this currency */
  public async hasExitQueue (
    currency: string
  ): Promise<boolean> {
    Validators.validate(currency, Validators.hasExitQueueSchema);
    return RootchainExitQueueModule.hasExitQueue.call(this, currency);
  } 

  /** Adds an exit queue to the OMG Network */
  public async addExitQueue (
    args: RootchainExitQueueModule.IAddExitQueue
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.addExitQueueSchema);
    return RootchainExitQueueModule.addExitQueue.call(this, args);
  }

  /** Start an exit for an in-flight transaction */
  public async startInFlightExit (
    args: RootchainInflightExitModule.IStartInflightExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.startInFlightExitSchema);
    return RootchainInflightExitModule.startInflightExit.call(this, args);
  }

  /** Piggyback onto an output of an in-flight transaction */
  public async piggybackInFlightExitOnOutput (
    args: RootchainInflightExitModule.IPiggybackInflightExitOnOutput
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.piggybackInFlightExitOnOutputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnOutput.call(this, args);
  }

  /** Piggyback onto an input of an in-flight transaction */
  public async piggybackInFlightExitOnInput (
    args: RootchainInflightExitModule.IPiggybackInflightExitOnInput
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.piggybackInFlightExitOnInputSchema);
    return RootchainInflightExitModule.piggybackInFlightExitOnInput.call(this, args);
  }

  /** Prove that an in-flight exit is not canonical */
  public async challengeInFlightExitNotCanonical (
    args: RootchainInflightExitModule.IChallengeInflightExitNotCanonical
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.challengeInFlightExitNotCanonicalSchema);
    return RootchainInflightExitModule.challengeInFlightExitNotCanonical.call(this, args);
  }

  /** Respond to competitors of an in-flight exit by showing the transaction is included */
  public async respondToNonCanonicalChallenge (
    args: RootchainInflightExitModule.IRespondToNonCanonicalChallenge
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.respondToNonCanonicalChallengeSchema);
    return RootchainInflightExitModule.respondToNonCanonicalChallenge.call(this, args);
  }

  /** Remove an input from list of exitable outputs in an in-flight transaction */
  public async challengeInFlightExitInputSpent (
    args: RootchainInflightExitModule.IChallengeInFlightExitInputSpent
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.challengeInFlightExitInputSpentSchema);
    return RootchainInflightExitModule.challengeInFlightExitInputSpent.call(this, args);
  }

  /** Remove an output from list of exitable outputs in an in-flight transaction */
  public async challengeInFlightExitOutputSpent (
    args: RootchainInflightExitModule.IChallengeInFlightExitOutputSpent
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.challengeInFlightExitOutputSpentSchema);
    return RootchainInflightExitModule.challengeInFlightExitOutputSpent.call(this, args);
  }

  /** Delete an in-flight exit if the first phase has passed and nobody has piggybacked the exit */
  public async deleteNonPiggybackedInFlightExit (
    args: RootchainInflightExitModule.IDeleteNonPiggybackedInFlightExit
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.deleteNonPiggybackedInFlightExitSchema);
    return RootchainInflightExitModule.deleteNonPiggybackedInFlightExit.call(this, args);
  }

  /** Get the UTXOs of an address */
  public async getUtxos (
    address: string
  ): Promise<Array<Interfaces.IUTXO>> {
    Validators.validate(address, Validators.getUtxosSchema);
    return WatcherAccountModule.getUtxos.call(this, address);
  }

  /** Get the balances of an address */
  public async getBalance (
    address: string
  ): Promise<Array<WatcherAccountModule.IBalance>> {
    Validators.validate(address, Validators.getBalanceSchema);
    return WatcherAccountModule.getBalance.call(this, address);
  }

  /** Get transaction information */
  public async getTransaction (
    id: string
  ): Promise<Interfaces.ITransactionData> {
    Validators.validate({ id }, Validators.getTransactionSchema);
    return WatcherTransactionModule.getTransaction.call(this, id);
  }

  /** Get transaction information using various filters */
  public async getTransactions (
    filters: WatcherTransactionModule.ITransactionFilter
  ): Promise<Array<Interfaces.ITransactionData>> {
    Validators.validate(filters, Validators.getTransactionsSchema);
    return WatcherTransactionModule.getTransactions.call(this, filters);
  }

  /** Get accepted fee information */
  public async getFees (): Promise<WatcherFeesModule.IFeeInfo> {
    return WatcherFeesModule.getFees.call(this);
  }

  /** Get deposit information */
  public async getDeposits (
    filters: WatcherDepositModule.IDepositFilter
  ): Promise<Array<WatcherDepositModule.IDepositInfo>> {
    Validators.validate(filters, Validators.getDepositsSchema);
    return WatcherDepositModule.getDeposits.call(this, filters);
  }

  /** Get the exit data for a UTXO */
  public async getExitData (
    utxo: Interfaces.IUTXO
  ): Promise<Interfaces.IExitData> {
    Validators.validate(utxo, Validators.getExitDataSchema);
    return WatcherUtxoModule.getExitData.call(this, utxo);
  }

  /** Get the challenge data for a UTXO */
  public async getChallengeData (
    utxoPos: number
  ): Promise<WatcherUtxoModule.IChallengeData> {
    Validators.validate({ utxoPos }, Validators.getChallengeDataSchema);
    return WatcherUtxoModule.getChallengeData.call(this, utxoPos);
  }

  /**
   * Create possible transactions using the utility from the Watcher
   * @param args.owner owner of the input utxos
   * @param args.payments payments made as outputs
   * @param args.feeCurrency address of the fee currency to be used
   * @param args.metadata metadata to include in the transaction
  */
  public async createTransaction (
    args: WatcherTransactionModule.ICreateTransaction
  ): Promise<WatcherTransactionModule.ICreatedTransactions> {
    Validators.validate(args, Validators.createTransactionSchema);
    return WatcherTransactionModule.createTransaction.call(this, args);
  }

  /** Create a transaction body locally with fine grain control */
  public createTransactionBody (
    args: TransactionBuilderModule.ICreateTransactionBody
  ): Partial<Interfaces.ITransactionBody> {
    Validators.validate(args, Validators.createTransactionBodySchema);
    return TransactionBuilderModule.createTransactionBody.call(this, args);
  }

  // NMTODO: maybe have to rename as txData input is not typed data
  /** Signs the transaction's typed data that is returned from `createTransaction` */
  public signTypedData (
    args: SignModule.ISignTypedData
  ): TypedDataModule.ITypedData {
    Validators.validate(args, Validators.signTypedDataSchema);
    return SignModule.signTypedData.call(this, args);
  }

  // NMTODO: figure out the return interface here
  /** Submits a transaction along with its typed data and signatures to the Watcher */
  public submitTyped (
    typedData: TypedDataModule.ITypedData
  ): Promise<any> {
    Validators.validate(typedData, Validators.submitTypedSchema);
    return WatcherTransactionModule.submitTyped.call(this, typedData);
  }

  /**
   * Signs typed data using passed private keys and returns an array of signatures
   * @param typedData typedData of the transaction
   * @param privateKeys array of private keys to sign each input of the transaction
  */
  public signTransaction (
    args: SignModule.ISignTransaction
  ): Array<string> {
    Validators.validate(args, Validators.signTransactionSchema);
    return SignModule.signTransaction.call(this, args);
  }

  /**
   * Build a signed transaction into the format expected by submitTransaction
   * @param typedData typedData of the transaction
   * @param signatures array of signatures to sign the transaction
  */
  public buildSignedTransaction (
    args: SignModule.IBuildSignedTransaction
  ): string {
    Validators.validate(args, Validators.buildSignedTransactionSchema);
    return SignModule.buildSignedTransaction.call(this, args);
  }

  /** Submit an encoded signed transaction to the Watcher */
  public submitTransaction (
    transaction: string
  ): Promise<Interfaces.IWatcherTransactionReceipt> {
    Validators.validate(transaction, Joi.string().required());
    return WatcherTransactionModule.submitTransaction.call(this, transaction);
  }

  /**
   * Merge utxos to a single output and submit it to the Watcher
   * @param utxos utxos to merge
   * @param privateKey private key to sign transaction
   * @param metadata metadata to include with the transaction
  */
  public mergeUtxos (
    args: TransactionBuilderModule.IMergeUtxos
  ): Promise<Interfaces.IWatcherTransactionReceipt> {
    Validators.validate(args, Validators.mergeUtxosSchema);
    return TransactionBuilderModule.mergeUtxos.call(this, args);
  }

  /** Get the status of the Watcher */
  public async getStatus (): Promise<WatcherStatusModule.IStatus> {
    return WatcherStatusModule.getStatus.call(this);
  }

  /** Get the data to challenge an invalid input piggybacked on an in-flight exit */
  public async inFlightExitGetInputChallengeData (
    args: WatcherInflightExitModule.IInFlightExitGetInputChallengeData
  ): Promise<WatcherInflightExitModule.IInflightExitInputChallengeData> {
    Validators.validate(args, Validators.inFlightExitGetInputChallengeDataSchema);
    return WatcherInflightExitModule.inFlightExitGetInputChallengeData.call(this, args);
  }

  /** Get the data to challenge an invalid output piggybacked on an in-flight exit. */
  public async inFlightExitGetOutputChallengeData (
    args: WatcherInflightExitModule.IInFlightExitGetOutputChallengeData
  ): Promise<WatcherInflightExitModule.IInflightExitOutputChallengeData> {
    Validators.validate(args, Validators.inFlightExitGetOutputChallengeDataSchema);
    return WatcherInflightExitModule.inFlightExitGetOutputChallengeData.call(this, args);
  }

  /** Get the exit data for an in-flight transaction */
  public async inFlightExitGetData (
    txbytes: string
  ): Promise<Interfaces.IExitData> {
    Validators.validate(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetData.call(this, txbytes);
  }

  /** Get the competitor for an in-flight transaction */
  public async inFlightExitGetCompetitor (
    txbytes: string
  ): Promise<WatcherInflightExitModule.IInflightExitCompetitor> {
    Validators.validate(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitGetCompetitor.call(this, txbytes);
  }

  /** Prove that a transaction has been put into a block (and therefore is canonical) */
  public async inFlightExitProveCanonical (
    txbytes: string
  ): Promise<string> {
    Validators.validate(txbytes, Joi.string().required());
    return WatcherInflightExitModule.inFlightExitProveCanonical.call(this, txbytes);
  }

  /** Retrieve the EVM revert reason from a transaction hash */
  public async getEVMErrorReason (
    txHash: string
  ): Promise<string> {
    Validators.validate(txHash, Joi.string().required());
    return RootchainUtilModule.getEVMErrorReason.call(this, txHash);
  }

  /**
   * Get the rootchain ERC20 balance of an address
   * @param address address to check
   * @param erc20Address address of the ERC20 token
  */
  public async getRootchainERC20Balance (
    args: RootchainUtilModule.IGetRootchainERC20Balance
  ): Promise<string> {
    Validators.validate(args, Validators.getErc20BalanceSchema);
    return RootchainUtilModule.getRootchainERC20Balance.call(this, args);
  }

  /** Get the rootchain ETH balance of an address */
  public async getRootchainETHBalance (
    address: string
  ): Promise<string> {
    Validators.validate(address, Validators.getRootchainETHBalanceSchema);
    return RootchainUtilModule.getRootchainETHBalance.call(this, address);
  }

  /**
   * Wait for x number of blocks of a rootchain transaction
   * @param transactionHash hash of the transaction to wait for
   * @param checkIntervalMs millisecond polling interval to check the current block
   * @param blocksToWait number of blocks to wait before transaction is confirmed
   * @param onCountdown callback that's passed the remaining number of blocks before confirmation
  */
  public async waitForRootchainTransaction (
    args: RootchainUtilModule.IWaitForRootchainTransaction
  ): Promise<Interfaces.ITransactionReceipt> {
    Validators.validate(args, Validators.waitForRootchainTransactionSchema);
    return RootchainUtilModule.waitForRootchainTransaction.call(this, args);
  }

  /**
   * Wait for an address to have a specified balance on the OMG Network
   * @param address address to check the balance of
   * @param expectedAmount the amount expected
   * @param currency the token address to check
  */
  public async waitForChildchainBalance (
    args: RootchainUtilModule.IWaitForChildchainBalance
  ): Promise<Array<WatcherAccountModule.IBalance>> {
    Validators.validate(args, Validators.waitForChildchainBalanceSchema);
    return RootchainUtilModule.waitForChildchainBalance.call(this, args);
  }

  /**
   * Wait for an addess to have a specific utxo on the OMG Network
   * @param address address to check for the utxo
   * @param oindex oindex of the specified utxo
   * @param txindex txindex of the specified utxo
   * @param blknum blknum of the specified utxo
   */
  public async waitForUtxo (
    args: RootchainUtilModule.IWaitForUtxo
  ): Promise<Interfaces.IUTXO> {
    Validators.validate(args, Validators.waitForUtxoSchema);
    return RootchainUtilModule.waitForUtxo.call(this, args);
  }

  /** Hash typed data */
  public hashTypedData (
    typedData: TypedDataModule.ITypedData
  ): Buffer {
    Validators.validate({ typedData }, Validators.hashTypedDataSchema);
    return StructHashModule.hashTypedData.call(this, typedData);
  }

  /** Get typed data from a transaction body */
  public getTypedData (
    transactionBody: Interfaces.ITransactionBody
  ): TypedDataModule.ITypedData {
    Validators.validate({ transactionBody }, Validators.getTypedDataSchema);
    return TypedDataModule.getTypedData.call(this, transactionBody);
  }

  /** Convert typed data into an array suitable for RLP encoding */
  public getTypedDataArray (
    typedDataMessage: TypedDataModule.ITypedDataMessage
  ): Array<any> {
    return EncoderModule.getTypedDataArray.call(this, typedDataMessage);
  }
}

export default OmgJS;
