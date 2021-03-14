module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const airnodeRrp = await deploy('AirnodeRrp', {
    from: accounts[0],
  });
  log(`Deployed Airnode RRP at ${airnodeRrp.address}`);
};
