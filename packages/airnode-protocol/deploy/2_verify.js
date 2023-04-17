const hre = require('hardhat');

module.exports = async ({ deployments }) => {
  const AccessControlRegistry = await deployments.get('AccessControlRegistry');
  await hre.run('verify:verify', {
    address: AccessControlRegistry.address,
    constructorArguments: [],
  });

  const RequesterAuthorizerWithAirnode = await deployments.get('RequesterAuthorizerWithAirnode');
  await hre.run('verify:verify', {
    address: RequesterAuthorizerWithAirnode.address,
    constructorArguments: [AccessControlRegistry.address, 'RequesterAuthorizerWithAirnode admin'],
  });

  const AirnodeRrpV0 = await deployments.get('AirnodeRrpV0');
  await hre.run('verify:verify', {
    address: AirnodeRrpV0.address,
    constructorArguments: [],
  });

  const AirnodeRrpV0DryRun = await deployments.get('AirnodeRrpV0DryRun');
  await hre.run('verify:verify', {
    address: AirnodeRrpV0DryRun.address,
    constructorArguments: [],
  });
};
module.exports.tags = ['verify'];
