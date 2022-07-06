import * as fs from 'fs';
import { OIS } from '@api3/ois';
import { randomHexString } from '@api3/airnode-utilities';
import { unsafeParseConfigWithSecrets, parseConfigWithSecrets, config as configTypes } from '@api3/airnode-validator';
import { goSync } from '@api3/promise-utils';

// Accessing specifically the `config` directory so we can export the content of the `config` module not the module itself
export * from '@api3/airnode-validator/dist/cjs/src/config';

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
  const goParse = goSync(() => JSON.parse(fs.readFileSync(configPath, 'utf8')));
  if (!goParse.success) throw new Error('Failed to parse config file');

  return goParse.data;
};

export function loadConfig(configPath: string, secrets: Record<string, string | undefined>) {
  const rawConfig = readConfig(configPath);
  const parsedConfigRes = parseConfigWithSecrets(rawConfig, secrets);
  if (!parsedConfigRes.success) {
    throw new Error(`Invalid Airnode configuration file: ${parsedConfigRes.error}`);
  }

  const config = parsedConfigRes.data;
  return config;
}

export function loadTrustedConfig(configPath: string, secrets: Record<string, string | undefined>): configTypes.Config {
  const rawConfig = readConfig(configPath);
  const config = unsafeParseConfigWithSecrets(rawConfig, secrets);

  const ois = parseOises(config.ois);
  return { ...config, ois };
}

export function getMasterKeyMnemonic(config: configTypes.Config): string {
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

export function setEnvValue(envName: string, envValue: string) {
  // eslint-disable-next-line functional/immutable-data
  process.env[envName] = envValue;
}

export function getAirnodeWalletPrivateKey() {
  const airnodeWalletPrivateKey = getEnvValue('AIRNODE_WALLET_PRIVATE_KEY');
  if (!airnodeWalletPrivateKey) {
    throw new Error('Missing Airnode wallet private key in environment variables.');
  }
  return airnodeWalletPrivateKey;
}
