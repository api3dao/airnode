import { readFileSync } from 'fs';
import { join } from 'path';
import { parse as parseEnvFile } from 'dotenv';
import prompts, { PromptObject } from 'prompts';
import isWsl from 'is-wsl';
import references from '@api3/airnode-protocol/deployments/references.json';

export const supportedNetworks = ['ethereum-sepolia-testnet', 'polygon-testnet', 'ethereum-goerli-testnet'] as const;

export interface IntegrationInfo {
  integration: string;
  airnodeType: 'aws' | 'local' | 'gcp';
  accessKeyId: string;
  secretKey: string;
  network: (typeof supportedNetworks)[number] | 'localhost';
  mnemonic: string;
  providerUrl: string;
  gcpProjectId?: string;
  crossChainNetwork?: (typeof supportedNetworks)[number] | 'localhost';
  crossChainProviderUrl?: string;
  crossChainMnemonic?: string;
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

/**
 * @param networkName The network name as listed in airnode-protocol/deployments
 * @returns The AirnodeRrpV0 contract address for the named network
 */
export const getExistingAirnodeRrpV0 = (networkName: string) => {
  const { chainNames, AirnodeRrpV0 } = references;

  // get network ID (key) for a given network name (value)
  const networkId = (Object.keys(chainNames) as (keyof typeof chainNames)[]).find((name) => {
    return chainNames[name] === networkName;
  });

  if (networkId) {
    return AirnodeRrpV0[networkId];
  } else {
    throw new Error(`Missing AirnodeRrpV0 address for network: ${networkName}`);
  }
};
