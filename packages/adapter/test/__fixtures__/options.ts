import { Options } from '../../src/types';
import { ois } from './ois';
import { securitySchemes } from './security';

export function getOptions(): Options {
  const options: Options = {
    ois: ois,
    endpointName: 'convertToUsd',
    parameters: { f: 'ETH', amount: '1' },
    securitySchemes: securitySchemes,
  };
  // Get a fresh clone to prevent updating references between tests
  return JSON.parse(JSON.stringify(options));
}

