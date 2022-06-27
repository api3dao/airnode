const config = require('../../jest.config.base');

module.exports = {
  ...config,
  displayName: 'e2e',
  setupFiles: ['<rootDir>/test/setup/init/set-define-property.ts'],
  testMatch: ['**/?(*.)+(feature).[tj]s?(x)'],
};
