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

  const AirnodeRrp = await deployments.get('AirnodeRrp');
  await hre.run('verify:verify', {
    address: AirnodeRrp.address,
    constructorArguments: [],
  });
};
module.exports.tags = ['Verify'];
module.exports.dependencies = ['Deploy'];
