import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-ethers';
import operationsConfig from '../airnode-operation/hardhat.config';

const config: HardhatUserConfig = {
  // Use the hardhat config from airnode-operations to make e2e tests work with the background services
  ...operationsConfig,
  paths: {
    root: '../airnode-operations',
  },
};

export default config;
