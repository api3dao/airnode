import { encode } from '@api3/airnode-abi';
import { cliPrint, getDeployedContract, readIntegrationInfo } from '../../src';

export const getEncodedParameters = () => {
  return encode([
    { name: 'coinIds', type: 'string32', value: 'bitcoin,ethereum' },
    { name: 'vsCurrency', type: 'string32', value: 'usd' },
  ]);
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  const data = await requester.fulfilledData(requestId);
  const { average, percentageChange } = data;

  // Divided by 1e8, because the response value is multiplied with 1e8 by Airnode
  cliPrint.info(`The average price of the coins = ${average / 1e8}`);
  cliPrint.info(`The average 30d percentage change = ${percentageChange / 1e8}`);
};
