import { readFileSync } from 'fs';
import { join } from 'path';

export interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'local';
  accessKeyId: string;
  secretKey: string;
  network: 'rinkeby' | 'localhost';
  mnemonic: string;
  providerUrl: string;
}

export const readIntegrationInfo = (): IntegrationInfo =>
  JSON.parse(readFileSync(join(__dirname, '../integration-info.json')).toString());

export const readConfig = () => {
  const integrationInfo = readIntegrationInfo();

  const config = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/config.json`)).toString()
  );
  return config;
};

export const formatSecrets = (secrets: string[]) => secrets.join('\n') + '\n';

export const removeExtension = (filename: string) => filename.split('.')[0];
