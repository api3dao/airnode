import { execSync } from 'child_process';
import { ethers } from 'ethers';
import {
  getAirnodeWallet,
  getAirnodeXpub,
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
} from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const airnodeWallet = getAirnodeWallet();
  const provider = getProvider();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);

  // Derive the sponsor wallet address
  const args = [
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.address}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${getAirnodeXpub(airnodeWallet)}`,
  ];
  const output = execSync(`yarn api3-admin derive-sponsor-wallet-address ${args.join(' ')}`).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();

  // Fund the derived sponsor wallet using sponsor account
  const balance = await sponsor.getBalance();
  const amountToSend = ethers.utils.parseEther('0.1');
  if (balance.lt(amountToSend)) throw new Error(`Sponsor account (${sponsor.address}) doesn't have enough funds!`);
  await sponsor.sendTransaction({ to: sponsorWalletAddress, value: amountToSend });

  console.log(`Successfully sent funds to sponsor wallet address: ${sponsorWalletAddress}`);
};

runAndHandleErrors(main);
