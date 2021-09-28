import { execSync } from 'child_process';
import { ethers } from 'ethers';
import {
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
  getAirnodeWallet,
  getAirnodeXpub,
  readConfig,
  IntegrationInfo,
} from '../src';

const fulfilled = async (requestId: string) => {
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const provider = getProvider();
  return new Promise((resolve) => provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve));
};

export const deriveSponsorWalletAddress = (
  integrationInfo: IntegrationInfo,
  airnodeRrp: ethers.Contract,
  airnodeWallet: ethers.Wallet,
  sponsor: ethers.Wallet
) => {
  const command = [
    `yarn api3-admin derive-sponsor-wallet-address`,
    `--providerUrl ${integrationInfo.providerUrl}`,
    `--airnodeRrp ${airnodeRrp.address}`,
    `--airnodeAddress ${airnodeWallet.address}`,
    `--sponsorAddress ${sponsor.address}`,
    `--xpub ${getAirnodeXpub(airnodeWallet)}`,
  ].join(' ');

  const output = execSync(command).toString();
  const sponsorWalletAddress = output.split('Sponsor wallet address:')[1].trim();
  return sponsorWalletAddress;
};

export const makeRequest = async (): Promise<string> => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  const endpointId = readConfig().triggers.rrp[0].endpointId;
  const sponsorWalletAddress = deriveSponsorWalletAddress(integrationInfo, airnodeRrp, airnodeWallet, sponsor);

  // Make the request
  const { getEncodedParameters } = await import(`../integrations/${integrationInfo.integration}/make-request.ts`);
  const receipt = await requester.makeRequest(
    airnodeWallet.address,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    getEncodedParameters()
  );

  // Wait until the transaction was mined
  return new Promise((resolve) =>
    getProvider().once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
};

const main = async () => {
  console.log('Making request...');
  const requestId = await makeRequest();
  console.log('Waiting for fulfillment...');
  await fulfilled(requestId);
  console.log('Request fulfilled');

  const integrationInfo = readIntegrationInfo();
  const { printResponse } = await import(`../integrations/${integrationInfo.integration}/make-request.ts`);
  await printResponse(requestId);
};

runAndHandleErrors(main);
