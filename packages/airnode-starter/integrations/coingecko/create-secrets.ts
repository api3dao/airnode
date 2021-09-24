import { writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { readAirnodeRrp, readChainId, readIntegrationInfo, formatSecrets } from '../../src';

async function createSecrets() {
  const integrationInfo = readIntegrationInfo();
  const wallet = ethers.Wallet.createRandom();

  const secrets = [
    `PROVIDER_URL=${integrationInfo.providerUrl}`,
    `AIRNODE_WALLET_MNEMONIC=${wallet.mnemonic.phrase}`,
    `AIRNODE_RRP_ADDRESS=${readAirnodeRrp().address}`,
    `CHAIN_ID=${await readChainId()}`,
    `CLOUD_PROVIDER_TYPE=${integrationInfo.airnodeType}`,
  ];

  writeFileSync(join(__dirname, 'secrets.env'), formatSecrets(secrets));
  console.log(`We have created 'secrets.env' file with the necessary credentials for you.`);
}

export default createSecrets;
