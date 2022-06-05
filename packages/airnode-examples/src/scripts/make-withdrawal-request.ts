import { ethers } from 'ethers';
import { deriveAirnodeXpub, deriveSponsorWalletAddress, requestWithdrawal, useAirnodeRrp } from '@api3/airnode-admin';
import {
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
  getAirnodeWallet,
  cliPrint,
  setMaxPromiseTimeout,
} from '../';

const waitForFulfillment = async (withdrawalRequestId: string) => {
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
  const provider = getProvider();
  return new Promise((resolve) =>
    provider.once(airnodeRrp.filters.FulfilledWithdrawal(null, null, withdrawalRequestId), resolve)
  );
};

const makeWithdrawalRequest = async (): Promise<string> => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const sponsorWalletAddress = await deriveSponsorWalletAddress(
    // NOTE: When doing this manually, you can use the 'derive-sponsor-wallet-address' and 'derive-airnode-xpub'
    // commands from the admin CLI package
    deriveAirnodeXpub(airnodeWallet.mnemonic.phrase),
    airnodeWallet.address,
    sponsor.address
  );

  // NOTE: You can use 'request-withdrawal' command from the admin CLI package
  const withdrawalRequestId = await requestWithdrawal(
    useAirnodeRrp(airnodeRrp),
    airnodeWallet.address,
    sponsorWalletAddress
  );
  return withdrawalRequestId;
};

const printWalletBalances = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const sponsorWalletAddress = await deriveSponsorWalletAddress(
    // NOTE: When doing this manually, you can use the 'derive-sponsor-wallet-address' and 'derive-airnode-xpub'
    // commands from the admin CLI package
    deriveAirnodeXpub(airnodeWallet.mnemonic.phrase),
    airnodeWallet.address,
    sponsor.address
  );

  const provider = getProvider();
  const sponsorBalance = ethers.utils.formatEther(await provider.getBalance(sponsor.address));
  const sponsorWalletBalance = ethers.utils.formatEther(await provider.getBalance(sponsorWalletAddress));

  cliPrint.info(`Sponsor balance: ${sponsorBalance}. Sponsor wallet balance: ${sponsorWalletBalance}`);
};

const main = async () => {
  await printWalletBalances();
  cliPrint.info('Making withdrawal request...');
  const requestId = await setMaxPromiseTimeout(makeWithdrawalRequest(), 80 * 1000);
  cliPrint.info('Waiting for fulfillment...');
  await waitForFulfillment(requestId);
  cliPrint.info('Withdrawal request fulfilled');
  await printWalletBalances();
};

runAndHandleErrors(main);
