import 'dotenv';
import OmgJs from '..';
import Web3 from 'web3';

const web3Provider = new Web3.providers.HttpProvider(process.env.ETH_NODE);

const omgjs = new OmgJs({
  plasmaContractAddress: process.env.PLASMAFRAMEWORK_CONTRACT_ADDRESS,
  watcherUrl: process.env.WATCHER_URL,
  web3Provider
});

// TODO: check if type importing from compiled actually working
