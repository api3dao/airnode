import { randomString } from '../utils/string-utils';
import rawConfig from '../../../config.json';
import rawSecurity from '../../../security.json';
import { Config, OIS, SecuritySpecification } from './types';

function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const oracleSpecifications = ois.oracleSpecifications.map((oracleSpec) => ({
      ...oracleSpec,
      id: randomString(16),
    }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomString(16) };
    return { ...ois, apiSpecifications, oracleSpecifications };
  });
}

function parseConfig(config: any): Config {
  const ois = parseOises(config.ois);
  return { ...config, ois };
}

// Add runtime configuration and typings
export const config = parseConfig(rawConfig);

export const security = rawSecurity as SecuritySpecification;

// 600 blocks = roughly 1 hour in the past
export const FROM_BLOCK_LIMIT = Number(process.env.PAST_BLOCK_LIMIT || '600');
export const NODE_WALLET_ADDRESS = process.env.NODE_WALLET_ADDRESS || '<TODO>';
