import { HardhatUserConfig } from 'hardhat/types';

import '@nomiclabs/hardhat-waffle';
import 'hardhat-typechain';

const config: HardhatUserConfig = {
  defaultNetwork: 'localhost',
  solidity: {
    compilers: [{ version: '0.6.12', settings: {} }],
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545/',
    },
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
};

export default config;
