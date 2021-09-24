import { existsSync } from 'fs';
import { join } from 'path';
import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import { IntegrationInfo, readIntegrationInfo } from './src';

const integrationInfoPath = join(__dirname, 'integration-info.json');
let integrationInfo: IntegrationInfo | null = null;
if (existsSync(integrationInfoPath)) {
  integrationInfo = readIntegrationInfo();
}

const networks: any = {};
if (integrationInfo && integrationInfo.network === 'rinkeby') {
  networks.rinkeby = {
    url: integrationInfo.providerUrl,
    accounts: { mnemonic: integrationInfo.mnemonic },
  };
}

const getDefaultNetwork = () => {
  if (!integrationInfo) return 'hardhat';
  return integrationInfo.network;
};

const config: HardhatUserConfig = {
  defaultNetwork: getDefaultNetwork(),
  networks,
  solidity: '0.8.6',
};

export default config;
