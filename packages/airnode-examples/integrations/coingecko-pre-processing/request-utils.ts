import { encode } from '@api3/airnode-abi';
import { cliPrint, getDeployedContract, readIntegrationInfo } from '../../src';

const coinLabel = 'Ethereum';
const coinId = coinLabel.toLowerCase();

const date = '2021-11-30';

export const getEncodedParameters = () => {
  return encode([
    { name: 'coinId', type: 'string32', value: coinId },
    { name: 'unixTimestamp', type: 'int256', value: Date.parse(date) / 1000 },
  ]);
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  // Divided by 1e6, because the response value is multiplied with 1e6 by Airnode
  cliPrint.info(`${coinLabel} price was ${(await requester.fulfilledData(requestId)) / 1e6} USD at ${date}`);
};
