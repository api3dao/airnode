require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-deploy');
require('hardhat-gas-reporter');

const fs = require('fs');
let credentials = require('./credentials.example.json');
if (fs.existsSync('./credentials.json')) {
  credentials = require('./credentials.json');
}

module.exports = {
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
    xdai: {
      url: credentials.xdai.providerUrl || '',
      accounts: { mnemonic: credentials.xdai.mnemonic || '' },
    },
    fantom: {
      url: credentials.fantom.providerUrl || '',
      accounts: { mnemonic: credentials.fantom.mnemonic || '' },
    },
  },
  paths: {
    tests: process.env.EXTENDED_TEST ? './extended-test' : './test',
  },
  solidity: {
    version: '0.8.6',
  },
};
