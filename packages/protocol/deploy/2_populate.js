module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const airnode = await deployments.get('Airnode');
  console.log(airnode.address);
  console.log(deployer);
};

module.exports.tags = ['populate'];
