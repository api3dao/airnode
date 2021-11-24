import fs from 'fs';
import { subtask } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from 'hardhat/builtin-tasks/task-names';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import { customCompiler } from '@api3/airnode-adapter/hardhat.config';

/**
 * This overrides the standard compiler version to use a custom compiled version.
 */
if (fs.existsSync('/.dockerenv')) {
// @ts-ignore
  subtask<{ readonly solcVersion: string }>(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, customCompiler);
}

let credentials = require('./credentials.example.json');
if (fs.existsSync('./credentials.json')) {
  credentials = require('./credentials.json');
}

module.exports = {
  etherscan: {
    apiKey: credentials.etherscanApiKey,
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
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
  },
};
