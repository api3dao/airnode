import { HardhatUserConfig } from 'hardhat/types';

const config: HardhatUserConfig = {
  defaultNetwork: 'localhost',
  solidity: {
    compilers: [{ version: '0.6.12', settings: {} }],
  },
  networks: {
    hardhat: {
      accounts: {
        // The "deployer" (provider.getSigner(0)) account is used to fund all
        // others accounts. So we need to make sure it's got enough ETH. The
        // below amount is 1 million ETH.
        accountsBalance: '1000000000000000000000000',
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
