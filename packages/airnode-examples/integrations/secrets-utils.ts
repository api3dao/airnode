import { writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { cliPrint, formatSecrets, getDeployedContract, readChainId, readIntegrationInfo } from '../src';

const getAirnodeRrpAddress = async (generateExampleFile: boolean) => {
  if (generateExampleFile) return '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const airnodeRrp = await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrp.sol');
  return airnodeRrp.address;
};

const createAirnodeWalletMnemonic = (generateExampleFile: boolean) => {
  if (generateExampleFile) return 'tube spin artefact salad slab lumber foot bitter wash reward vote cook';

  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic.phrase;
};

export const getCommonSecrets = async (generateExampleFile: boolean) => {
  const integrationInfo = readIntegrationInfo();

  return [
    `AIRNODE_WALLET_MNEMONIC=${createAirnodeWalletMnemonic(generateExampleFile)}`,
    `AIRNODE_RRP_ADDRESS=${await getAirnodeRrpAddress(generateExampleFile)}`,
    `CHAIN_ID=${generateExampleFile ? 31337 : await readChainId()}`,
    `CLOUD_PROVIDER_TYPE=${generateExampleFile ? 'local' : integrationInfo.airnodeType}`,
    `PROVIDER_URL=${generateExampleFile ? 'http://127.0.0.1:8545/' : integrationInfo.providerUrl}`,
  ];
};

export const writeSecrets = (dirname: string, secrets: string[], generateExampleFile: boolean) => {
  const filename = generateExampleFile ? 'secrets.example.env' : 'secrets.env';
  writeFileSync(join(dirname, filename), formatSecrets(secrets));

  cliPrint.info(`A '${filename}' has been created.`);
};
