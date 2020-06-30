import { randomString } from '../utils/string-utils';
import rawSecurity from '../../../security.json';
import rawSpecs from '../../../specs.json';
import { SecuritySpecification, Specification } from './types';

function parseSpecs(specs: any): Specification[] {
  // Assign unique identifiers to each API and Oracle specification.
  return specs.map((spec: Specification) => {
    const oracleSpecifications = spec.oracleSpecifications.map((oracleSpec) => ({
      ...oracleSpec,
      id: randomString(16),
    }));

    const apiSpecifications = { ...spec.apiSpecifications, id: randomString(16) };
    return { ...spec, apiSpecifications, oracleSpecifications };
  });
}

// Cast the raw JSON files with the defined types
export const specs = parseSpecs(rawSpecs) as Specification[];
export const security = rawSecurity as SecuritySpecification;

// 600 blocks = roughly 1 hour in the past
export const FROM_BLOCK_LIMIT = Number(process.env.PAST_BLOCK_LIMIT || '600');
export const NODE_WALLET_ADDRESS = process.env.NODE_WALLET_ADDRESS || '0x123456789';
