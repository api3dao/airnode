import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import hre from 'hardhat';
import { ethers } from 'ethers';
import { readIntegrationInfo } from '../src';

const getContract = async (name: string) => {
  const deployment = await hre.deployments.get(name);
  const contract = await hre.ethers.getContractAt(deployment.abi, deployment.address);

  return contract;
};

export const readReceipt = () => {
  const integrationInfo = readIntegrationInfo();

  const receipt = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/receipt.json`)).toString()
  );
  return receipt;
};

async function main() {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getContract('AirnodeRrp');
  const airnodeWallet = readReceipt().airnodeWallet;
  const provider = new ethers.providers.JsonRpcProvider(integrationInfo.providerUrl);
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);

  // Derive the sponsor wallet address
  const args = [
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.airnodeAddress}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${airnodeWallet.xpub}`,
  ];
  const output = execSync(`yarn admin derive-sponsor-wallet-address ${args.join(' ')}`).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();

  // Fund the derived sponsor wallet using sponsor account
  const balance = await sponsor.getBalance();
  const amountToSend = ethers.utils.parseEther('0.3');
  if (balance.lt(amountToSend)) throw new Error(`Sponsor account (${sponsor.address}) doesn't have enough funds!`);
  await sponsor.sendTransaction({ to: sponsorWalletAddress, value: amountToSend });

  console.log(`Successfully sent funds to sponsor wallet address: ${sponsorWalletAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
