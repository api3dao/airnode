import { readIntegrationInfo, deployContract, getDeployedContract, runAndHandleErrors } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');

  const requester = await deployContract(`contracts/${integrationInfo.integration}/Requester.sol`, [
    airnodeRrp.address,
  ]);
  console.log(`Requester deployed to address: ${requester.address}`);
};

runAndHandleErrors(main);
