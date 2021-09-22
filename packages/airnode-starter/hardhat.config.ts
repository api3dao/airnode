import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { HardhatUserConfig } from 'hardhat/types';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';

const integrationInfoPath = join(__dirname, 'integration-info.json');
let integrationInfo: Record<string, string> = {};
if (existsSync(integrationInfoPath)) {
  integrationInfo = JSON.parse(readFileSync(integrationInfoPath).toString());
}

const config: HardhatUserConfig = {
  defaultNetwork: integrationInfo.network || 'hardhat',
  networks: {
    rinkeby: {
      url: integrationInfo.providerUrl,
      accounts: { mnemonic: integrationInfo.mnemonic },
    },
  },
  solidity: '0.8.6',
};

export default config;
