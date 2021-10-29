import { readIntegrationInfo, deployContract, getDeployedContract, runAndHandleErrors, cliPrint } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');

  const requester = await deployContract(`contracts/${integrationInfo.integration}/Requester.sol`, [
    airnodeRrp.address,
  ]);
  cliPrint.info(`Requester deployed to address: ${requester.address}`);
};

runAndHandleErrors(main);
