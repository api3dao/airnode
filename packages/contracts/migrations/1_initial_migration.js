const Migrations = artifacts.require('Migrations'); // eslint-disable-line no-undef

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
