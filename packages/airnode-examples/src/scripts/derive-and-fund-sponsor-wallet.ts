import { ethers } from 'ethers';
import { deriveSponsorWalletAddress, deriveAirnodeXpub } from '@api3/airnode-admin';
import { cliPrint, getAirnodeWallet, getProvider, readIntegrationInfo, runAndHandleErrors } from '../';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeWallet = getAirnodeWallet();
  const provider = getProvider();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);
  // NOTE: When doing this manually, you can use the 'derive-airnode-xpub' command from the admin CLI package
  const airnodeXpub = deriveAirnodeXpub(airnodeWallet.mnemonic.phrase);

  // Derive the sponsor wallet address programatically
  // NOTE: When doing this manually, you can use the 'derive-sponsor-wallet-address' command from the admin CLI package
  const sponsorWalletAddress = await deriveSponsorWalletAddress(airnodeXpub, airnodeWallet.address, sponsor.address);

  // Fund the derived sponsor wallet using sponsor account
  const balance = await sponsor.getBalance();
  const amountToSend = ethers.utils.parseEther('0.1');
  if (balance.lt(amountToSend)) throw new Error(`Sponsor account (${sponsor.address}) doesn't have enough funds!`);
  const tx = await sponsor.sendTransaction({ to: sponsorWalletAddress, value: amountToSend });
  await tx.wait();

  // Print out the sponsor wallet address and balance
  const sponsorWalletRawBalance = await provider.getBalance(sponsorWalletAddress);
  const sponsorWalletBalance = ethers.utils.formatEther(sponsorWalletRawBalance);
  cliPrint.info(`Successfully sent funds to sponsor wallet address: ${sponsorWalletAddress}.`);
  cliPrint.info(`Current balance: ${sponsorWalletBalance}`);
};

runAndHandleErrors(main);
