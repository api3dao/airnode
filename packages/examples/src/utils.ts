import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseEnvFile } from 'dotenv';

export interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'local';
  accessKeyId: string;
  secretKey: string;
  network: 'rinkeby' | 'localhost';
  mnemonic: string;
  providerUrl: string;
}

/**
 * @returns The contents of the "integration-info.json" file (throws if it doesn't exist)
 */
export const readIntegrationInfo = (): IntegrationInfo =>
  JSON.parse(readFileSync(join(__dirname, '../integration-info.json')).toString());

/**
 * @returns The contents of the "aws.env" file (throws if it doesn't exist)
 */
export const readAwsSecrets = () => parseEnvFile(readFileSync(join(__dirname, '../aws.env')));

/**
 * @returns The contents of the "secrets.env" file for the current integration (throws if it doesn't exist)
 */
export const readAirnodeSecrets = () => {
  const integrationInfo = readIntegrationInfo();

  return parseEnvFile(readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/secrets.env`)));
};

/**
 * @returns The contents of the "config.json" file for the current integration (throws if it doesn't exist)
 */
export const readConfig = () => {
  const integrationInfo = readIntegrationInfo();

  const config = JSON.parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/config.json`)).toString()
  );
  return config;
};

/**
 * @param secrets The lines of the secrets file
 * @returns All the lines joined followed by a new line symbol
 */
export const formatSecrets = (secrets: string[]) => secrets.join('\n') + '\n';

/**
 * @param filename
 * @returns The "filename" with the last extension removed
 */
export const removeExtension = (filename: string) => filename.split('.')[0];
