import { ethers } from 'ethers';
import { operation } from '../fixtures';
import { startCoordinator } from '../../src/workers/local-handlers';
import { getMasterHDNode, deriveSponsorWallet } from '../../src/evm/wallet';
import { deployAirnodeAndMakeRequests, fetchAllLogNames, increaseTestTimeout } from '../setup/e2e';

// It's difficult to check exact balances because of the gas costs
const expectEthInRange = (eth: ethers.BigNumber, from: string, to: string) => {
  expect(eth.gt(ethers.utils.parseEther(from))).toEqual(true);
  expect(eth.lt(ethers.utils.parseEther(to))).toEqual(true);
};

it('processes withdrawals only once', async () => {
  increaseTestTimeout();
  const { deployment, provider, config } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildWithdrawal(),
  ]);

  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual(['SetAirnodeXpub', 'SetSponsorshipStatus', 'CreatedTemplate', 'RequestedWithdrawal']);

  const alice = deployment.sponsors.find((s) => s.id === 'alice');
  const hdNode = getMasterHDNode(config);
  const sponsorWalletAddress = deriveSponsorWallet(hdNode, alice!.address).address;

  const preWithdrawalBalance = await provider.getBalance(alice!.address);
  expectEthInRange(preWithdrawalBalance, '1.99', '2.01');

  const preWithdrawalSponsorWalletBalance = await provider.getBalance(sponsorWalletAddress);
  expectEthInRange(preWithdrawalSponsorWalletBalance, '1.99', '2.01');

  await startCoordinator();

  const postWithdrawalBalance = await provider.getBalance(alice!.address);
  expectEthInRange(postWithdrawalBalance, '3.9', '4.01');

  const postWithdrawalSponsorWalletBalance = await provider.getBalance(sponsorWalletAddress);
  expectEthInRange(postWithdrawalSponsorWalletBalance, '0', '0.0005');

  // Check that the relevant withdrawal events are present
  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual([
    'SetAirnodeXpub',
    'SetSponsorshipStatus',
    'CreatedTemplate',
    'RequestedWithdrawal',
    'FulfilledWithdrawal',
  ]);

  await startCoordinator();

  // Withdrawals are not processed twice
  const afterPostInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(afterPostInvokeLogs).toEqual(postInvokeLogs);

  // Balances have not changed
  const afterPostWithdrawalBalance = await provider.getBalance(alice!.address);
  expect(afterPostWithdrawalBalance).toEqual(postWithdrawalBalance);
  const afterPostWithdrawalSponsorWalletBalance = await provider.getBalance(sponsorWalletAddress);
  expect(afterPostWithdrawalSponsorWalletBalance).toEqual(postWithdrawalSponsorWalletBalance);
});
