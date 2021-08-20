import fs from 'fs';
import { ethers } from 'ethers';
import * as e2e from '../setup/e2e';
import * as fixtures from '../fixtures';
import * as handlers from '../../src/workers/local-handlers';
import * as wallet from '../../src/evm/wallet';

it('processes withdrawals only once', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const requests = [fixtures.operation.buildWithdrawal({ requesterId: 'alice' })];

  const deployerIndex = e2e.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });

  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  await e2e.makeRequests(deployConfig, deployment);

  const nodeSettings = fixtures.buildNodeSettings({
    airnodeWalletMnemonic: deployConfig.airnodes.CurrencyConverterAirnode.mnemonic,
  });
  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain], nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  // Check that the relevant withdrawal events are present
  const preinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  const preinvokeWithdrawals = preinvokeLogs.filter((log) => log.name === 'RequestedWithdrawal');
  const preinvokeFulfillments = preinvokeLogs.filter((log) => log.name === 'FulfilledWithdrawal');

  expect(preinvokeLogs.length).toEqual(6);
  expect(preinvokeWithdrawals.length).toEqual(1);
  expect(preinvokeFulfillments.length).toEqual(0);

  const alice = deployment.requesters.find((r) => r.id === 'alice');
  const hdNode = wallet.getMasterHDNode(config);
  const designatedAddress = wallet.deriveWalletAddressFromIndex(hdNode, alice!.requesterIndex);

  // It's difficult to check exact balances because the requester has made transactions at this
  // point, so check current balance is > 1.99 ETH and < 2.01 ETH
  const preWithdrawalBalance = await provider.getBalance(alice!.address);
  expect(preWithdrawalBalance.gt(ethers.utils.parseEther('1.99'))).toEqual(true);
  expect(preWithdrawalBalance.lt(ethers.utils.parseEther('2.01'))).toEqual(true);

  const preWithdrawalDesignatedBalance = await provider.getBalance(designatedAddress);
  expect(preWithdrawalDesignatedBalance.gt(ethers.utils.parseEther('1.99'))).toEqual(true);
  expect(preWithdrawalDesignatedBalance.lt(ethers.utils.parseEther('2.01'))).toEqual(true);

  await handlers.startCoordinator();

  const postWithdrawalBalance = await provider.getBalance(alice!.address);
  expect(postWithdrawalBalance.gt(ethers.utils.parseEther('3.9'))).toEqual(true);
  expect(postWithdrawalBalance.lt(ethers.utils.parseEther('4.01'))).toEqual(true);

  // There is still some dust left over after withdrawing, so check balance is < 0.0005 ETH
  const postWithdrawalDesignatedBalance = await provider.getBalance(designatedAddress);
  expect(postWithdrawalDesignatedBalance.lt(ethers.utils.parseEther('0.0005'))).toEqual(true);

  // Check that the relevant withdrawal events are present
  const postinvokeLogs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  const postinvokeWithdrawals = postinvokeLogs.filter((log) => log.name === 'RequestedWithdrawal');
  const postinvokeFulfillments = postinvokeLogs.filter((log) => log.name === 'FulfilledWithdrawal');

  expect(postinvokeLogs.length).toEqual(7);
  expect(postinvokeWithdrawals.length).toEqual(1);
  expect(postinvokeFulfillments.length).toEqual(1);

  await handlers.startCoordinator();

  // Withdrawals are not processed twice
  const run2Logs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);
  expect(run2Logs.length).toEqual(7);

  // Balances have not changed
  const run2Balance = await provider.getBalance(alice!.address);
  expect(run2Balance).toEqual(postWithdrawalBalance);
  const run2DesignatedBalance = await provider.getBalance(designatedAddress);
  expect(run2DesignatedBalance).toEqual(postWithdrawalDesignatedBalance);
});
