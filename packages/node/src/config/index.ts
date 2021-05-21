import { OIS } from '@airnode/ois';
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

export function parseConfig(config: any): Config {
  const ois = parseOises(config.ois);
  return { ...config, ois };
}

export function getMasterKeyMnemonic(): string {
  const mnemonic = process.env.MASTER_KEY_MNEMONIC;
  // The node cannot function without a master mnemonic
  if (!mnemonic) {
    throw new Error('Unable to find MASTER_KEY_MNEMONIC from the environment. Please ensure this is set first');
  }
  return mnemonic;
}

export function getConfigSecret(oisTitle: string, securitySchemeName: string) {
  const replacedOisTitle = oisTitle.replace('-', '_');
  const replacedSecuritySchemeName = securitySchemeName.replace('-', '_');
  return process.env[`${replacedOisTitle}_${replacedSecuritySchemeName}`];
}
