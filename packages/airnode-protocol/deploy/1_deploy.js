const hre = require('hardhat');

module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const accessControlRegistry = await deploy('AccessControlRegistry', {
    from: accounts[0],
    log: true,
    deterministicDeployment: process.env.DETERMINISTIC ? hre.ethers.constants.HashZero : undefined,
  });
  log(`Deployed AccessControlRegistry at ${accessControlRegistry.address}`);

  const requesterAuthorizerWithAirnode = await deploy('RequesterAuthorizerWithAirnode', {
    args: [accessControlRegistry.address, 'RequesterAuthorizerWithAirnode admin'],
    from: accounts[0],
    log: true,
    deterministicDeployment: process.env.DETERMINISTIC ? hre.ethers.constants.HashZero : undefined,
  });
  log(`Deployed RequesterAuthorizerWithAirnode at ${requesterAuthorizerWithAirnode.address}`);

  const airnodeRrpV0 = await deploy('AirnodeRrpV0', {
    from: accounts[0],
    log: true,
    deterministicDeployment: process.env.DETERMINISTIC ? hre.ethers.constants.HashZero : undefined,
  });
  log(`Deployed AirnodeRrpV0 at ${airnodeRrpV0.address}`);

  const airnodeRrpV0DryRun = await deploy('AirnodeRrpV0DryRun', {
    from: accounts[0],
    log: true,
    deterministicDeployment: process.env.DETERMINISTIC ? hre.ethers.constants.HashZero : undefined,
  });
  log(`Deployed AirnodeRrpV0DryRun at ${airnodeRrpV0DryRun.address}`);
};
module.exports.tags = ['deploy'];
