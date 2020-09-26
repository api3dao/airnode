/* global ethers */

require('@nomiclabs/buidler');

const config = require('../config.json');

async function main() {
  const accounts = await ethers.getSigners();
  const admin = accounts[0];
  const adminAddress = await admin.getAddress();

  const Airnode = await ethers.getContractFactory('Airnode');
  const airnode = await Airnode.deploy();
  await airnode.deployed();

  const Convenience = await ethers.getContractFactory('Convenience');
  const convenience = await Convenience.deploy(airnode.address);
  await convenience.deployed();

  const providerPromises = config.providers.map(async (provider) => {
    return await airnode
      .connect(adminAddress)
      .createProvider(adminAddress, provider.designationDeposit, provider.minimumBalance);
  });

  const providers = await Promise.all(providerPromises);
  console.log(providers);

  console.log('Protocol deployed to:', airnode.address);
  console.log('Convenience deployed to:', convenience.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
