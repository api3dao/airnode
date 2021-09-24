import { readFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';

const INTEGRATION_INFO_PATH = join(__dirname, '../integration-info.json');

export interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'local';
  accessKeyId: string;
  secretKey: string;
  network: 'rinkeby' | 'localhost';
  mnemonic: string;
  providerUrl: string;
}

export const readIntegrationInfo = (): IntegrationInfo => JSON.parse(readFileSync(INTEGRATION_INFO_PATH).toString());

export const readReceipt = () => {
  const integrationInfo = readIntegrationInfo();

  const receipt = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/receipt.json`)).toString()
  );
  return receipt;
};

export const readAirnodeRrp = () => {
  const integrationInfo = readIntegrationInfo();

  const airnodeRrp = JSON.parse(
    readFileSync(join(__dirname, `../deployments/${integrationInfo.network}/AirnodeRrp.json`)).toString()
  );
  return airnodeRrp;
};

export const readChainId = async () => {
  const integrationInfo = readIntegrationInfo();

  const { chainId } = await new ethers.providers.JsonRpcProvider(integrationInfo.providerUrl).getNetwork();
  return chainId;
};

export const readConfig = () => {
  const integrationInfo = readIntegrationInfo();

  const config = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/config.json`)).toString()
  );
  return config;
};

export const formatSecrets = (secrets: string[]) => secrets.join('\n') + '\n';
