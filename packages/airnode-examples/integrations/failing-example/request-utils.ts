import { encode } from '@api3/airnode-abi';
import { cliPrint, getDeployedContract, readIntegrationInfo } from '../../src';

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();

export const getEncodedParameters = () => {
  return encode([{ name: 'coinId', type: 'string32', value: coinId }]);
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  // Divided by 1e6, because the response value is multiplied with 1e6 by Airnode
  cliPrint.info(`${coinLabel} price is ${(await requester.fulfilledData(requestId)) / 1e6} USD`);
};
