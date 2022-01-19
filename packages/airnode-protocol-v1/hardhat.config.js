require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-gas-reporter');

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    outputFile: 'gas_report',
    noColors: true,
  },
  mocha: {
    timeout: process.env.EXTENDED_TEST ? 60000 : 20000,
  },
  paths: {
    tests: process.env.EXTENDED_TEST ? './extended-test' : './test',
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};
