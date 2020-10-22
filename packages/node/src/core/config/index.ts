import { OIS, SecuritySpecification } from '@airnode/ois';
import { Config } from '../../types';
import { randomString } from '../utils/string-utils';
import rawConfig from '../../config.json';
import rawSecurity from '../../security.json';

function parseOises(oises: OIS[]): OIS[] {
  // Assign unique identifiers to each API and Oracle specification.
  return oises.map((ois) => {
    const endpoints = ois.endpoints.map((endpoint) => ({ ...endpoint, id: randomString(16) }));

    const apiSpecifications = { ...ois.apiSpecifications, id: randomString(16) };
    return { ...ois, apiSpecifications, endpoints };
  });
}

function parseConfig(config: any): Config {
  const ois = parseOises(config.ois);
  return { ...config, ois };
}

// Add runtime configuration and typings
export const config = parseConfig(rawConfig);

export const security = rawSecurity as SecuritySpecification;
