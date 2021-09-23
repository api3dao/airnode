module.exports = async ({ getUnnamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const accounts = await getUnnamedAccounts();

  const airnodeRequesterRrpAuthorizer = await deploy('AirnodeRequesterRrpAuthorizer', {
    from: accounts[2],
    log: true,
  });
  log(`Deployed AirnodeRequesterRrpAuthorizer at ${airnodeRequesterRrpAuthorizer.address}`);

  const airnodeRrp = await deploy('AirnodeRrp', {
    from: accounts[2],
    log: true,
  });
  log(`Deployed Airnode RRP at ${airnodeRrp.address}`);
};
