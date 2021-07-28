import { ApiCredentials } from '@api3/ois';

export function buildCredentials(overrides?: Partial<ApiCredentials>): ApiCredentials {
  return {
    securityScheme: 'myapiApiScheme',
    value: 'super-secret-key',
    ...overrides,
  };
}
