const config = require('../../jest.config.base');

module.exports = {
  ...config,
  // Add custom settings below
  displayName: 'unit',
  name: 'unit',
  ...config,
  setupFiles: ['<rootDir>/test/setup/init/set-define-property.ts', '<rootDir>/test/setup/init/set-env-vars.ts'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
