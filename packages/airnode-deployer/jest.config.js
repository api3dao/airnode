const config = require('../../jest.config.base');

module.exports = {
  ...config,
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
