import * as fs from 'fs';
import { OIS } from '@api3/ois';
import template from 'lodash/template';
import { Config } from '../types';
import { randomString } from '../utils/string-utils';

// Regular expression that does not match anything, ensuring no escaping or interpolation happens
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L199
const NO_MATCH_REGEXP = /($^)/;
// Regular expression matching ES template literal delimiter (${}) with escaping
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L175
const ES_MATCH_REGEXP = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

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
  const interpolatedConfig = template(config, {
    escape: NO_MATCH_REGEXP,
    evaluate: NO_MATCH_REGEXP,
    interpolate: ES_MATCH_REGEXP,
  })(secrets);
  const parsedConfig = JSON.parse(interpolatedConfig);

  const ois = parseOises(parsedConfig.ois);
  return { ...parsedConfig, ois };
}

export function getMasterKeyMnemonic(): string {
  const mnemonic = process.env.MASTER_KEY_MNEMONIC;
  // The node cannot function without a master mnemonic
  if (!mnemonic) {
    throw new Error('Unable to find MASTER_KEY_MNEMONIC from the environment. Please ensure this is set first');
  }
  return mnemonic;
}

export function getEnvValue(envName: string) {
  return process.env[envName];
}
