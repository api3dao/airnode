import { writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { readAirnodeRrp, readIntegrationInfo } from '../../src';

const integrationInfo = readIntegrationInfo();

async function createSecrets() {
  const wallet = ethers.Wallet.createRandom();
  const airnodeSecrets = [
    `AIRNODE_WALLET_MNEMONIC=${wallet.mnemonic.phrase}`,
    `PROVIDER_URL=${integrationInfo.providerUrl}`,
    `AIRNODE_RRP_ADDRESS=${readAirnodeRrp().address}`,
  ];
  // TODO: write this to a separate file as helper function
  writeFileSync(join(__dirname, 'secrets.env'), airnodeSecrets.join('\n') + '\n');

  console.log(`We have created 'secrets.env' file with the necessary credentials for you.`);
}

export default createSecrets;
