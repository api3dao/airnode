import { ethers } from 'ethers';
import {
  getDeployedContract,
  getProvider,
  readIntegrationInfo,
  runAndHandleErrors,
  cliPrint,
  setMaxPromiseTimeout,
} from '../';

const waitForFulfillment = async (requestId: string) => {
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
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
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');

  // Import the "makeRequest" which triggers the Airnode request.
  // See the "request-utils.ts" of the specific integration for details.
  const { makeRequest } = await import(`../../integrations/${integrationInfo.integration}/request-utils.ts`);
  const receipt = await makeRequest();

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
  const { printResponse } = await import(`../../integrations/${integrationInfo.integration}/request-utils.ts`);
  await printResponse(requestId);
};

runAndHandleErrors(main);
