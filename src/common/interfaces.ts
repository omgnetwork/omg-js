export interface ITransactionOptions {
  from: string;
  privateKey?: string;
  gas?: number;
  gasPrice?: string;
};

export interface ITransactionReceipt {
  blockHash: string;
  blockNumber: number;
  contractAddress: string;
  cumulativeGasUsed: number;
  from: string;
  gasUsed: number;
  logs: Object[];
  root: string;
  to: string;
  transactionHash: string;
  transactionIndex: number;
};
