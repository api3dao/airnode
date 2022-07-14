import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseEnvFile } from 'dotenv';
import prompts, { PromptObject } from 'prompts';
import isWsl from 'is-wsl';

export interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'local' | 'gcp';
  accessKeyId: string;
  secretKey: string;
  network: 'rinkeby' | 'ropsten' | 'polygon-mumbai' | 'goerli' | 'kovan' | 'localhost';
  mnemonic: string;
  providerUrl: string;
  gcpProjectId?: string;
}

/**
 * @returns true if this platform is MacOS, Windows or WSL
 */
export const isMacOrWindows = () => process.platform === 'win32' || process.platform === 'darwin' || isWsl;

/**
 * @returns true if platform is Windows or WSL
 */
export const isWindows = () => process.platform === 'win32' || isWsl;

/**
 * @returns The contents of the "integration-info.json" file (throws if it doesn't exist)
 */
export const readIntegrationInfo = (): IntegrationInfo =>
  JSON.parse(readFileSync(join(__dirname, '../integration-info.json')).toString());

/**
 * @returns The contents of the "aws.env" file (throws if it doesn't exist)
 */
export const readAwsSecrets = () => {
  const integrationInfo = readIntegrationInfo();

  return parseEnvFile(readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/aws.env`)));
};

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
 * @param filename
 * @returns The package version from the file (throws if it doesn't exist)
 */
export const readPackageVersion = (filename = '../package.json') => {
  const packageJson = JSON.parse(readFileSync(join(__dirname, filename)).toString());
  return packageJson.version;
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

export const promptQuestions = (questions: PromptObject[]) =>
  prompts(questions, {
    // https://github.com/terkelg/prompts/issues/27#issuecomment-527693302
    onCancel: () => {
      throw new Error('Aborted by the user');
    },
  });

export const setMaxPromiseTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject('Timeout exceeded!'), timeoutMs))]);
