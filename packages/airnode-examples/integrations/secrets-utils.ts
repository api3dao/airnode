import { writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { cliPrint, formatSecrets, readIntegrationInfo } from '../src';

const createAirnodeWalletMnemonic = (generateExampleFile: boolean) => {
  if (generateExampleFile) return 'tube spin artefact salad slab lumber foot bitter wash reward vote cook';

  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic.phrase;
};

export const getCommonSecrets = (generateExampleFile: boolean) => {
  // NOTE: Avoid reading integrationInfo.json when generating example file
  return [
    `AIRNODE_WALLET_MNEMONIC=${createAirnodeWalletMnemonic(generateExampleFile)}`,
    `PROVIDER_URL=${generateExampleFile ? 'http://127.0.0.1:8545/' : readIntegrationInfo().providerUrl}`,
  ];
};

export const writeSecrets = (dirname: string, secrets: string[], generateExampleFile: boolean) => {
  const filename = generateExampleFile ? 'secrets.example.env' : 'secrets.env';
  writeFileSync(join(dirname, filename), formatSecrets(secrets));

  cliPrint.info(`A '${filename}' has been created.`);
};
