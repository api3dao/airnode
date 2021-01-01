module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const airnode = await deploy('Airnode', {
    from: accounts[0],
  });
  log(`Deployed Airnode at ${airnode.address}`);

  const convenience = await deploy('Convenience', {
    args: [airnode.address],
    from: accounts[0],
  });
  log(`Deployed Convenience at ${convenience.address}`);
};
