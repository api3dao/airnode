require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('solidity-coverage');
require('hardhat-deploy');
require('hardhat-gas-reporter');

const fs = require('fs');
let credentials = require('./credentials.example.json');
if (fs.existsSync('./credentials.json')) {
  credentials = require('./credentials.json');
}

module.exports = {
  etherscan: {
    apiKey: credentials.etherscanApiKey,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    outputFile: 'gas_report',
    noColors: true,
  },
  networks: {
    mainnet: {
      url: credentials.mainnet.providerUrl || '',
      accounts: { mnemonic: credentials.mainnet.mnemonic || '' },
    },
    ropsten: {
      url: credentials.ropsten.providerUrl || '',
      accounts: { mnemonic: credentials.ropsten.mnemonic || '' },
    },
    rinkeby: {
      url: credentials.rinkeby.providerUrl || '',
      accounts: { mnemonic: credentials.rinkeby.mnemonic || '' },
    },
    goerli: {
      url: credentials.goerli.providerUrl || '',
      accounts: { mnemonic: credentials.goerli.mnemonic || '' },
    },
    kovan: {
      url: credentials.kovan.providerUrl || '',
      accounts: { mnemonic: credentials.kovan.mnemonic || '' },
    },
  },
  paths: {
    tests: process.env.EXTENDED_TEST ? './extended-test' : './test',
  },
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
