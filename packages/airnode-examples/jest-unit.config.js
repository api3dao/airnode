const config = require('../../jest.config.base');

module.exports = {
  ...config,
  // Add custom settings below
  displayName: 'unit',
  name: 'unit',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
