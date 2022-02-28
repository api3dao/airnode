import * as fs from 'fs';
import { OIS } from '@api3/airnode-ois';
import { randomHexString } from '@api3/airnode-utilities';
import { unsafeParseConfigWithSecrets } from '@api3/airnode-validator';
import { Config } from './types';

// TODO: Is this needed?
function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const endpoints = ois.endpoints.map((endpoint) => ({ ...endpoint, id: randomHexString(32) }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomHexString(32) };
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

export function loadTrustedConfig(configPath: string, secrets: Record<string, string | undefined>): Config {
  const rawConfig = readConfig(configPath);
  const config = unsafeParseConfigWithSecrets(rawConfig, secrets);

  const ois = parseOises(config.ois);
  return { ...config, ois };
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
