import { BaseApiCredentials } from '../../src/types';

export function buildCredentials(overrides?: Partial<BaseApiCredentials>): BaseApiCredentials[] {
  return [
    {
      securitySchemeName: 'myApiSecurityScheme',
      securitySchemeValue: 'super-secret-key',
      ...overrides,
    },
  ];
}
