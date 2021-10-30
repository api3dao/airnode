module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const accessControlRegistry = await deploy('AccessControlRegistry', {
    from: accounts[0],
    log: true,
  });
  log(`Deployed AccessControlRegistry at ${accessControlRegistry.address}`);

  const requesterAuthorizerWithAirnode = await deploy('RequesterAuthorizerWithAirnode', {
    args: [accessControlRegistry.address, 'RequesterAuthorizerWithAirnode admin'],
    from: accounts[0],
    log: true,
  });
  log(`Deployed RequesterAuthorizerWithAirnode at ${requesterAuthorizerWithAirnode.address}`);

  const airnodeRrp = await deploy('AirnodeRrp', {
    from: accounts[0],
    log: true,
  });
  log(`Deployed Airnode RRP at ${airnodeRrp.address}`);
};
module.exports.tags = ['Deploy'];
