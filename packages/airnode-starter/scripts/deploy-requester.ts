import { readIntegrationInfo, deployContract, getDeployedContract } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');

  const requester = await deployContract(`contracts/${integrationInfo.integration}/Requester.sol`, [
    airnodeRrp.address,
  ]);
  console.log(`Requester deployed to address: ${requester.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
