import { cliPrint, deployContract, runAndHandleErrors } from '../';

const main = async () => {
  const airnodeRrp = await deployContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
  cliPrint.info(`AirnodeRrp deployed to address: ${airnodeRrp.address}`);
};

runAndHandleErrors(main);
