import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deployer: DeployFunction = async function ({ getUnnamedAccounts, deployments }: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const airnodeRrp = await deploy('AirnodeRrp', {
    from: accounts[0],
  });

  log(`Deployed Airnode RRP at ${airnodeRrp.address}`);
};

// https://github.com/wighawag/hardhat-deploy/tree/master#deploy-scripts-tags-and-dependencies
deployer.tags = ['rrp'];

export default deployer;
