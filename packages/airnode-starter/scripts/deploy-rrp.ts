import { deployContract } from '../src';

async function main() {
  const airnodeRrp = await deployContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');
  console.log(`AirnodeRrp deployed to address: ${airnodeRrp.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
