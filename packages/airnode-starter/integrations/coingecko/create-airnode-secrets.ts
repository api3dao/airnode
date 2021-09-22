import { writeFileSync } from 'fs';
import { ethers } from 'ethers';
import { readIntegrationInfo } from '../../src';

const integrationInfo = readIntegrationInfo();

async function main() {
  const wallet = ethers.Wallet.createRandom();
  const airnodeSecrets = [
    `AIRNODE_WALLET_MNEMONIC=${wallet.mnemonic.phrase}`,
    `PROVIDER_URL=${integrationInfo.providerUrl}`,
  ];
  // TODO: write this to a separate file as helper function
  writeFileSync('secrets.env', airnodeSecrets.join('\n') + '\n');

  console.log(`We have created 'secrets.env' file with the necessary credentials for you.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
