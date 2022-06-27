const config = require('../../jest.config.base');

module.exports = {
  ...config,
  displayName: 'unit',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};
