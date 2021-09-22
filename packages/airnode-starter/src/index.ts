import { readFileSync } from 'fs';
import { join } from 'path';

const INTEGRATION_INFO_PATH = join(__dirname, '../integration-info.json');

interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'containerized';
  accessKeyId: string;
  secretKey: string;
  network: 'rinkeby' | 'hardhat';
  mnemonic: string;
  providerUrl: string;
}

export const readIntegrationInfo = (): IntegrationInfo => {
  // TODO:
  // if (!existsSync(INTEGRATION_INFO_PATH)) return null;

  return JSON.parse(readFileSync(INTEGRATION_INFO_PATH).toString());
};

export const readReceipt = () => {
  const integrationInfo = readIntegrationInfo();

  const receipt = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo?.integration}/receipt.json`)).toString()
  );
  return receipt;
};

export const readAirnodeRrp = () => {
  const integrationInfo = readIntegrationInfo();

  const airnodeRrp = JSON.parse(
    readFileSync(join(__dirname, `../deployments/${integrationInfo?.network}/AirnodeRrp.json`)).toString()
  );
  return airnodeRrp;
};

export const readConfig = () => {
  const integrationInfo = readIntegrationInfo();

  const config = JSON.parse(
    readFileSync(join(__dirname, `../deployments/${integrationInfo?.integration}/config.json`)).toString()
  );
  return config;
};
