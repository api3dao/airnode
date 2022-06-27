const config = require('../../jest.config.base');

module.exports = {
  ...config,
  displayName: 'unit',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
