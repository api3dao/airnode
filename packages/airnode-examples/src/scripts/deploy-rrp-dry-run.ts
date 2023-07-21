import { cliPrint, deployContract, runAndHandleErrors } from '../';

const main = async () => {
  const airnodeRrpDryRun = await deployContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0DryRun.sol');
  cliPrint.info(`AirnodeRrpV0DryRun deployed to address: ${airnodeRrpDryRun.address}`);
};

runAndHandleErrors(main);
