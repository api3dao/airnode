module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const airnode = await deploy('Airnode', {
    from: accounts[0],
  });
  log(`Deployed Airnode at ${airnode.address}`);
};
