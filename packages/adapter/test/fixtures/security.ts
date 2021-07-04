import { SecuritySchemeSecret } from '@api3/ois';

export const securitySchemeSecrets: readonly SecuritySchemeSecret[] = [
  { securitySchemeName: 'myapiApiScheme', value: 'super-secret-key' },
];
