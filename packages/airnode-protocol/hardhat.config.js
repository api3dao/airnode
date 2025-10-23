require('@nomicfoundation/hardhat-verify');
require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-deploy');
require('hardhat-gas-reporter');
const api3Contracts = require('@api3/contracts');
require('dotenv').config();

const etherscan = api3Contracts.hardhatConfig.etherscan();
const networks = api3Contracts.hardhatConfig.networks();

module.exports = {
  etherscan,
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    outputFile: 'gas_report',
    noColors: true,
  },
  networks,
  paths: {
    tests: process.env.EXTENDED_TEST ? './extended-test' : './test',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
};
