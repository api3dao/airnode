import { ethers } from 'ethers';
import { deriveAirnodeXpub, deriveSponsorWalletAddress } from '@api3/airnode-admin';
import {
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
  getAirnodeWallet,
  readConfig,
  cliPrint,
  setMaxPromiseTimeout,
} from '../src';

const waitForFulfillment = async (requestId: string) => {
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  const provider = getProvider();

  const fulfilled = new Promise((resolve) =>
    provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve)
  );
  const failed = new Promise((resolve) =>
    provider.once(airnodeRrp.filters.FailedRequest(null, requestId), resolve)
  ).then((rawRequestFailedLog) => {
    const log = airnodeRrp.interface.parseLog(rawRequestFailedLog as ethers.Event);
    throw new Error(`Request failed. Reason:\n${log.args.errorMessage}`);
  });

  // Airnode request can either:
  // 1) be fulfilled - in that case this promise resolves
  // 2) fail - in that case, this promise rejects and this function throws an error
  // 3) never be processed - this means the request is invalid or a bug in Airnode. This should not happen.
  await Promise.race([fulfilled, failed]);
};

const makeRequest = async (): Promise<string> => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  const airnodeWallet = getAirnodeWallet();
  const sponsor = ethers.Wallet.fromMnemonic(integrationInfo.mnemonic);
  // NOTE: The request is always made to the first endpoint listed in the "triggers.rrp" inside config.json
  const endpointId = readConfig().triggers.rrp[0].endpointId;
  // NOTE: When doing this manually, you can use the 'derive-sponsor-wallet-address' and 'derive-airnode-xpub' commands
  // from the admin CLI package
  const sponsorWalletAddress = await deriveSponsorWalletAddress(
    deriveAirnodeXpub(airnodeWallet.mnemonic.phrase),
    airnodeWallet.address,
    sponsor.address
  );

  // Import the function to get encoded parameters for the Airnode. See the respective "request-utils.ts" for details.
  const { getEncodedParameters } = await import(`../integrations/${integrationInfo.integration}/request-utils.ts`);
  // Trigger the Airnode request

  const receipt = await requester.makeRequest(
    airnodeWallet.address,
    endpointId,
    sponsor.address,
    sponsorWalletAddress,
    await getEncodedParameters()
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
  await setMaxPromiseTimeout(waitForFulfillment(requestId), 180 * 1000);
  cliPrint.info('Request fulfilled');

  const integrationInfo = readIntegrationInfo();
  // Import the function to print the response from the chosen integration. See the respective "request-utils.ts" for
  // details.
  const { printResponse } = await import(`../integrations/${integrationInfo.integration}/request-utils.ts`);
  await printResponse(requestId);
};

runAndHandleErrors(main);
