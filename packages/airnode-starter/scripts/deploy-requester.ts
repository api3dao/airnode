import { readdirSync } from 'fs';
import hre from 'hardhat';
import 'hardhat-deploy';
import { readIntegrationInfo } from '../src';

async function main() {
  const accounts = await hre.getUnnamedAccounts();
  const airnodeRrp = await hre.deployments.get('AirnodeRrp');
  const integrationInfo = readIntegrationInfo();

  const requesterContractName = readdirSync(`${__dirname}/../contracts/${integrationInfo.integration}`)[0];
  const artifactName = requesterContractName.split('.')[0]; // Remove .sol extension
  const requester = await hre.deployments.deploy(artifactName, {
    from: accounts[0],
    args: [airnodeRrp.address],
  });
  console.log(`Requester deployed at address: ${requester.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
