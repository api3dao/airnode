import { getDeployedContract, getProvider, readIntegrationInfo } from '../src';

async function fulfilled(requestId: string) {
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  const provider = getProvider();
  return new Promise((resolve) => provider.once(airnodeRrp.filters.FulfilledRequest(null, requestId), resolve));
}

// TODO: maybe just call the make-request and handle all logic there...
async function main() {
  const integrationInfo = readIntegrationInfo();
  // TODO: What to do if this file is misssing?
  const { makeRequest, printResponse } = await import(`../integrations/${integrationInfo.integration}/make-request.ts`);

  console.log('Making request...');
  const requestId = await makeRequest();
  console.log('Waiting for fulfillment...');

  await fulfilled(requestId);
  console.log('Request fulfilled');

  await printResponse(requestId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
