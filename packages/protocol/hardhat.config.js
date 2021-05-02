require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-deploy');

const fs = require('fs');
let credentials = require('./credentials.example.json');
if (fs.existsSync('./credentials.json')) {
  credentials = require('./credentials.json');
}

module.exports = {
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
    xdai: {
      url: credentials.xdai.providerUrl || '',
      accounts: { mnemonic: credentials.xdai.mnemonic || '' },
    },
    fantom: {
      url: credentials.fantom.providerUrl || '',
      accounts: { mnemonic: credentials.fantom.mnemonic || '' },
    },
  },
  solidity: {
    version: '0.6.12',
  },
};
