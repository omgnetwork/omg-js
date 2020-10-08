import Web3 from 'web3';
import * as dotenv from 'dotenv';
dotenv.config();

import OmgJs from '..';

const web3Provider = new Web3.providers.HttpProvider(process.env.ETH_NODE);
const omgjs = new OmgJs({
  plasmaContractAddress: process.env.PLASMAFRAMEWORK_CONTRACT_ADDRESS,
  watcherUrl: process.env.WATCHER_URL,
  web3Provider
});

async function depositEth (): Promise<void> {
  const receipt = await omgjs.deposit({
    amount: '1',
    txOptions: {
      from: process.env.ALICE_ETH_ADDRESS,
      privateKey: process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY
    }
  });

  console.log('deposit success: ', receipt.transactionHash);
}

depositEth();
