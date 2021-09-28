import { encode } from '@api3/airnode-abi';
import { getDeployedContract, readIntegrationInfo } from '../../src';

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();

export async function getEncodedParameters() {
  return encode([{ name: 'coinId', type: 'bytes32', value: coinId }]);
}

export async function printResponse(requestId: string) {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  // Divided by 1e6, because the response value is multiplied with 1e6 by Airnode
  console.log(`${coinLabel} price is ${(await requester.fulfilledData(requestId)) / 1e6} USD`);
}
