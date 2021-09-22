import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';

const credentialsPath = join(__dirname, 'hardhat-credentials.json');
if (!existsSync(credentialsPath)) {
  throw new Error(`Expected ${credentialsPath} to exist! Please create it and try again.`);
}
const { mainnet, ropsten, rinkeby, goerli, xdai, fantom } = JSON.parse(readFileSync(credentialsPath).toString());

const integrationInfoPath = join(__dirname, 'integration-info.json');
let defaultNetwork = 'hardhat';
if (existsSync(integrationInfoPath)) {
  const integrationInfo = JSON.parse(readFileSync(integrationInfoPath).toString());
  defaultNetwork = integrationInfo.network;
}

const config: HardhatUserConfig = {
  defaultNetwork,
  networks: {
    // TODO: Support only rinkeby - setup for other networks should be simple if there is ever need for it
    mainnet: {
      url: mainnet.providerUrl,
      accounts: { mnemonic: mainnet.mnemonic },
    },
    ropsten: {
      url: ropsten.providerUrl,
      accounts: { mnemonic: ropsten.mnemonic },
    },
    rinkeby: {
      url: rinkeby.providerUrl,
      accounts: { mnemonic: rinkeby.mnemonic },
    },
    goerli: {
      url: goerli.providerUrl,
      accounts: { mnemonic: goerli.mnemonic },
    },
    xdai: {
      url: xdai.providerUrl,
      accounts: { mnemonic: xdai.mnemonic },
    },
    fantom: {
      url: fantom.providerUrl,
      accounts: { mnemonic: fantom.mnemonic },
    },
  },
  solidity: '0.8.6',
};

export default config;
