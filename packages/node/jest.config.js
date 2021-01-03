const config = require('../../jest.config.base');

module.exports = {
  ...config,
  // Add custom settings below
  setupFiles: ['<rootDir>/test/setup/set-define-property.ts', '<rootDir>/test/setup/set-env-vars.ts'],
};
