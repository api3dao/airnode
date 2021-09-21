import hre from 'hardhat';
import 'hardhat-deploy';

async function main() {
  const accounts = await hre.getUnnamedAccounts();
  const airnodeRrp = await hre.deployments.get('AirnodeRrp');
  const exampleRequester = await hre.deployments.deploy('ExampleRequester', {
    from: accounts[0],
    args: [airnodeRrp.address],
  });
  console.log(`ExampleRequester deployed at address: ${exampleRequester.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
