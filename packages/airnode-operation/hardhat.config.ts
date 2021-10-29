import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
  defaultNetwork: 'localhost',
  solidity: {
    compilers: [{ version: '0.6.12', settings: {} }],
  },
  networks: {
    hardhat: {
      accounts: {
        // These accounts are used to deploy contracts and fund all Airnode
        // related accounts. Make sure they have more than enough ETH to
        // do this (1m ETH each).
        accountsBalance: '1000000000000000000000000',
        count: 1000,
      },
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
    },
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
};

export default config;
