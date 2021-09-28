import { writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { formatSecrets, getDeployedContract, readChainId, readIntegrationInfo } from '../src';

export const getCommonSecrets = async () => {
  const integrationInfo = readIntegrationInfo();
  const wallet = ethers.Wallet.createRandom();
  const airnodeRrp = await getDeployedContract('@api3/protocol/contracts/rrp/AirnodeRrp.sol');

  return [
    `PROVIDER_URL=${integrationInfo.providerUrl}`,
    `AIRNODE_WALLET_MNEMONIC=${wallet.mnemonic.phrase}`,
    `AIRNODE_RRP_ADDRESS=${airnodeRrp.address}`,
    `CHAIN_ID=${await readChainId()}`,
    `CLOUD_PROVIDER_TYPE=${integrationInfo.airnodeType}`,
  ];
};

export const writeSecrets = (secrets: string[]) => {
  const integrationInfo = readIntegrationInfo();
  writeFileSync(join(__dirname, integrationInfo.integration, 'secrets.env'), formatSecrets(secrets));
  console.log(`A 'secrets.env' file with the required credentials has been created.`);
};
