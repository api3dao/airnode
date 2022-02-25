const config = require('../../jest.config.base');

module.exports = {
  ...config,
  // Add custom settings below
  displayName: 'unit',
  name: 'unit',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};
