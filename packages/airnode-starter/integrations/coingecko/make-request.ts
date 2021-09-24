import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { encode } from '@api3/airnode-abi';
import { ethers } from 'ethers';
import { readConfig, readIntegrationInfo, readReceipt } from '../../src';

const getContract = async (name: string) => {
  const deployment = await hre.deployments.get(name);
  const contract = await hre.ethers.getContractAt(deployment.abi, deployment.address);

  return contract;
};

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();

export async function makeRequest(): Promise<string> {
  const integrationInfo = readIntegrationInfo();

  // TODO: The two lines below should be in helper fn
  const requesterContractName = readdirSync(`${__dirname}/../../contracts/${integrationInfo.integration}`)[0];
  const artifactName = requesterContractName.split('.')[0]; // Remove .sol extension
  const requester = await getContract(artifactName);

  const airnodeRrp = await getContract('AirnodeRrp');
  const airnodeWallet = readReceipt().airnodeWallet;
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const endpointId = readConfig().triggers.rrp[0].endpointId;

  const args = [
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.airnodeAddress}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${airnodeWallet.xpub}`,
  ];
  const output = execSync(`yarn admin derive-sponsor-wallet-address ${args.join(' ')}`).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();

  const receipt = await requester.makeRequest(
    airnodeWallet.airnodeAddress,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    encode([{ name: 'coinId', type: 'bytes32', value: coinId }])
  );

  return new Promise((resolve) =>
    hre.ethers.provider.once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
}

export async function printResponse(requestId: string) {
  const integrationInfo = readIntegrationInfo();

  // TODO: The two lines below should be in helper fn
  const requesterContractName = readdirSync(`${__dirname}/../../contracts/${integrationInfo.integration}`)[0];
  const artifactName = requesterContractName.split('.')[0]; // Remove .sol extension
  const requester = await getContract(artifactName);

  console.log(`${coinLabel} price is ${await requester.fulfilledData(requestId)} USD`);
}
