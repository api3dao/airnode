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
  cliPrint,
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
  // NOTE: The request is always made to the first endpoint listed in the "triggers.rrp" inside config.json
  const endpointId = readConfig().triggers.rrp[0].endpointId;
  const sponsorWalletAddress = deriveSponsorWalletAddress(integrationInfo, airnodeRrp, airnodeWallet, sponsor);

  // Import the function to get encoded parameters for the Airnode. See the respective "make-request.ts" for details.
  const { getEncodedParameters } = await import(`../integrations/${integrationInfo.integration}/make-request.ts`);
  // Trigger the Airnode request
  const receipt = await requester.makeRequest(
    airnodeWallet.address,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    getEncodedParameters()
  );

  // Wait until the transaction is mined
  return new Promise((resolve) =>
    getProvider().once(receipt.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.requestId);
    })
  );
};

const main = async () => {
  cliPrint.info('Making request...');
  const requestId = await makeRequest();
  cliPrint.info('Waiting for fulfillment...');
  await fulfilled(requestId);
  cliPrint.info('Request fulfilled');

  const integrationInfo = readIntegrationInfo();
  // Import the function to print the response from the chosen integration. See the respective "make-request.ts" for
  // details.
  const { printResponse } = await import(`../integrations/${integrationInfo.integration}/make-request.ts`);
  await printResponse(requestId);
};

runAndHandleErrors(main);
