import { ApiCredentials } from '../../src/types';

export function buildCredentials(overrides?: Partial<ApiCredentials>): ApiCredentials[] {
  return [
    {
      securitySchemeName: 'myapiApiScheme',
      securitySchemeValue: 'super-secret-key',
      ...overrides,
    },
  ];
}
