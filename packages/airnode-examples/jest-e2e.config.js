const config = require('../../jest.config.base');

module.exports = {
  ...config,
  displayName: 'e2e',
  testMatch: ['**/?(*.)+(feature).[tj]s?(x)'],
};
