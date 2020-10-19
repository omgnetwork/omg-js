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

import Web3 from 'web3';
import web3Utils from 'web3-utils';
import path from 'path';
import { assert, should, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import OmgJS from '../..';

import faucet from '../helpers/faucet';
import * as rcHelper from '../helpers/rootChainHelper';
import config from '../test-config';

should();
use(chaiAsPromised);

const faucetName = path.basename(__filename);

const web3Provider = new Web3.providers.HttpProvider(config.eth_node);
const omgjs = new OmgJS({
  plasmaContractAddress: config.plasmaframework_contract_address,
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url,
  web3Provider
});

describe('amountTypes.js', function () {
  let aliceAccount;
  const INTIIAL_ALICE_AMOUNT = web3Utils.toWei('0.5', 'ether');
  const INITIAL_AMOUNT_ERC20 = 3;

  before(async function () {
    await faucet.init({ faucetName });
  });

  beforeEach(async function () {
    aliceAccount = rcHelper.createAccount();
    await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT);
    await faucet.fundRootchainERC20(aliceAccount.address, INITIAL_AMOUNT_ERC20);
    await Promise.all([
      rcHelper.waitForEthBalanceEq(aliceAccount.address, INTIIAL_ALICE_AMOUNT),
      rcHelper.waitForERC20BalanceEq(aliceAccount.address, config.erc20_contract_address, INITIAL_AMOUNT_ERC20)
    ]);
  });

  afterEach(async function () {
    try {
      await faucet.returnFunds(aliceAccount);
    } catch (err) {
      console.warn(`Error trying to return funds to the faucet: ${err}`);
    }
  });

  it('approveToken() should only accept safe integers and strings and BN', async function () {
    const numberReceipt = await omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: 10,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(numberReceipt, ['transactionHash']);

    const stringReceipt = await omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: '999999999999999999999999',
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(stringReceipt, ['transactionHash']);

    const bnReceipt = await omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: web3Utils.toBN(1),
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(bnReceipt, ['transactionHash']);

    const unsafeReceipt = omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: 999999999999999999999999999999999999999999999999999999999999,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(unsafeReceipt);

    const decimalReceipt = omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: 1.35,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(decimalReceipt);

    const decimalStringReceipt = omgjs.approveERC20Deposit({
      erc20Address: config.erc20_contract_address,
      amount: '1.23',
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(decimalStringReceipt);
  });

  it('deposit() should only accept safe integers, strings, and BN', async function () {
    const numberDeposit = await omgjs.deposit({
      amount: 1,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(numberDeposit, ['transactionHash']);

    const stringDeposit = await omgjs.deposit({
      amount: '1',
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(stringDeposit, ['transactionHash']);

    const BNDeposit = await omgjs.deposit({
      amount: web3Utils.toBN(1),
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.hasAnyKeys(BNDeposit, ['transactionHash']);

    const unsafeDeposit = omgjs.deposit({
      amount: 99999999999999999999999999999999999,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(unsafeDeposit);

    const decimalDeposit = omgjs.deposit({
      amount: 0.1,
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(decimalDeposit);

    const stringDecimalDeposit = omgjs.deposit({
      amount: '1.23',
      txOptions: {
        from: aliceAccount.address,
        privateKey: aliceAccount.privateKey
      }
    });
    assert.isRejected(stringDecimalDeposit);
  });
});
