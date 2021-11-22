import { cliPrint, getDeployedContract, readIntegrationInfo } from '../../src';

const coinSymbol = 'ETH';

export const getEncodedParameters = () => {
  return '0x';
};

export const printResponse = async (requestId: string) => {
  const integrationInfo = readIntegrationInfo();
  const requester = await getDeployedContract(`contracts/${integrationInfo.integration}/Requester.sol`);

  // Divided by 1e6, because the response value is multiplied with 1e6 by Airnode
  cliPrint.info(`${coinSymbol} price is ${(await requester.fulfilledData(requestId)) / 1e6} USD`);
};
