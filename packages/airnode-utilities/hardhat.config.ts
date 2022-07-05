import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-ethers';

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545/',
    },
  },
  defaultNetwork: 'localhost',
};

export default config;
