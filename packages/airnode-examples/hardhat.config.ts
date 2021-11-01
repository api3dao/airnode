import { join } from 'path';
import { existsSync } from 'fs';
import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import { IntegrationInfo, readIntegrationInfo } from './src';

const integrationInfoPath = join(__dirname, 'integration-info.json');
let integrationInfo: IntegrationInfo | null = null;
if (existsSync(integrationInfoPath)) {
  integrationInfo = readIntegrationInfo();
}

const networks: any = {};
if (integrationInfo) {
  networks[integrationInfo.network] = {
    url: integrationInfo.providerUrl,
    accounts: { mnemonic: integrationInfo.mnemonic },
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: integrationInfo?.network,
  networks,
  solidity: '0.8.9',
};

export default config;
