import { deployContract, runAndHandleErrors } from '../src';

async function main() {
  const airnodeRrp = await deployContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  console.log(`AirnodeRrp deployed to address: ${airnodeRrp.address}`);
}

runAndHandleErrors(main);
