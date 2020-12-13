module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const airnode = await deploy('Airnode', {
    from: deployer,
  });
  log(`Deployed Airnode at ${airnode.address}`);

  const convenience = await deploy('Convenience', {
    args: [airnode.address],
    from: deployer,
  });
  log(`Deployed Convenience at ${convenience.address}`);
};
