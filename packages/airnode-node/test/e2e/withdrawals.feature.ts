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

increaseTestTimeout();

it('processes withdrawals only once', async () => {
  const { deployment, provider, config } = await deployAirnodeAndMakeRequests(__filename, [
    operation.buildWithdrawal(),
  ]);

  const preInvokeExpectedLogs = ['RequestedWithdrawal'];
  const preInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(preInvokeLogs).toEqual(expect.arrayContaining(preInvokeExpectedLogs));

  const alice = deployment.sponsors.find((s) => s.id === 'alice');
  const hdNode = getMasterHDNode(config);
  const sponsorWalletAddress = deriveSponsorWallet(hdNode, alice!.address).address;

  const preWithdrawalBalance = await provider.getBalance(alice!.address);
  expectEthInRange(preWithdrawalBalance, '1.99', '2.01');

  const preWithdrawalSponsorWalletBalance = await provider.getBalance(sponsorWalletAddress);
  expectEthInRange(preWithdrawalSponsorWalletBalance, '1.99', '2.01');

  await startCoordinator();

  const postWithdrawalBalance = await provider.getBalance(alice!.address);
  expectEthInRange(postWithdrawalBalance, '2.9', '3.01');

  // ~1 ETH should remain given the withdrawalRemainder chainConfig option
  const postWithdrawalSponsorWalletBalance = await provider.getBalance(sponsorWalletAddress);
  expectEthInRange(postWithdrawalSponsorWalletBalance, '0.95', '1.05');

  // Check that the relevant withdrawal events are present
  const postInvokeExpectedLogs = [...preInvokeExpectedLogs, 'RequestedWithdrawal'];
  const postInvokeLogs = await fetchAllLogNames(provider, deployment.contracts.AirnodeRrp);
  expect(postInvokeLogs).toEqual(expect.arrayContaining(postInvokeExpectedLogs));

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
