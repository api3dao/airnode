import { cliPrint, deployContract, runAndHandleErrors } from '../src';

const main = async () => {
  const airnodeRrp = await deployContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  cliPrint.info(`AirnodeRrp deployed to address: ${airnodeRrp.address}`);
};

runAndHandleErrors(main);
