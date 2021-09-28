import { readIntegrationInfo, deployContract, getDeployedContract, runAndHandleErrors } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');

  const requester = await deployContract(`contracts/${integrationInfo.integration}/Requester.sol`, [
    airnodeRrp.address,
  ]);
  console.log(`Requester deployed to address: ${requester.address}`);
}

runAndHandleErrors(main);
