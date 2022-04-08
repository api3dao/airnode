const config = require('../../jest.config.base');

module.exports = {
  ...config,
  // Add custom settings below
  displayName: 'unit',
  name: 'unit',
  setupFiles: ['<rootDir>/test/setup/init/set-define-property.ts'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};
