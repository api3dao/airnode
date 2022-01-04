import * as fs from 'fs';
import { OIS } from '@api3/airnode-ois';
import { validateJsonWithTemplate, Result } from '@api3/airnode-validator';
import { version as getNodeVersion } from '../index';
import { Config } from '../types';
import { randomString } from '../utils/string-utils';

// TODO: Is this needed?
function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const endpoints = ois.endpoints.map((endpoint) => ({ ...endpoint, id: randomString(16) }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomString(16) };
    return { ...ois, apiSpecifications, endpoints };
  });
}

const readConfig = (configPath: string): unknown => {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error('Failed to parse config file');
  }
};

export interface ParseConfigResult {
  config: Config;
  validationOutput: Result;
  shouldSkipValidation: boolean;
}

export function parseConfig(configPath: string, secrets: Record<string, string | undefined>): ParseConfigResult {
  const config = readConfig(configPath);
  const validationResult = validateConfig(config, secrets);
  const parsedConfig: Config = validationResult.specs as Config;
  const ois = parseOises(parsedConfig.ois);

  return {
    config: { ...parsedConfig, ois },
    shouldSkipValidation: !!parsedConfig.nodeSettings.skipValidation,
    validationOutput: validationResult,
  };
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

function validateConfig(supposedConfig: unknown, secrets: Record<string, string | undefined>): Result {
  // TODO: Improve TS types
  return validateJsonWithTemplate(supposedConfig as object, `config@${getNodeVersion()}`, secrets, true);
}
