import * as fs from 'fs';
import { OIS } from '@api3/airnode-ois';
import { validateJsonWithTemplate, Result } from '@api3/airnode-validator';
import { Config } from '../types';
import { randomString } from '../utils/string-utils';

function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const endpoints = ois.endpoints.map((endpoint) => ({ ...endpoint, id: randomString(16) }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomString(16) };
    return { ...ois, apiSpecifications, endpoints };
  });
}

export function parseConfig(configPath: string, secrets: Record<string, string | undefined>): Config {
  const config = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = JSON.parse(config);
  const validationResult = validateConfig(parsedConfig, secrets);

  if (!validationResult.valid) {
    throw new Error(`Invalid Airnode configuration file: ${JSON.stringify(validationResult.messages)}`);
  }

  const ois = parseOises(parsedConfig.ois);

  return { ...parsedConfig, ois };
}

export function getMasterKeyMnemonic(config: Config): string {
  const mnemonic = config.nodeSettings.airnodeWalletMnemonic;
  // The node cannot function without a master mnemonic
  if (!mnemonic) {
    throw new Error('Unable to find Airnode wallet mnemonic in the configuration. Please ensure this is set first');
  }
  return mnemonic;
}

export function getEnvValue(envName: string) {
  return process.env[envName];
}

function validateConfig(supposedConfig: any, secrets: Record<string, string | undefined>): Result {
  // TODO: config version
  return validateJsonWithTemplate(supposedConfig, 'config', secrets);
}
