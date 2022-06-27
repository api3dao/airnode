const config = require('../../jest.config.base');

module.exports = {
  projects: [
    {
      ...config,
      displayName: 'e2e',
      testMatch: ['**/?(*.)+(feature).[tj]s?(x)'],
    },
    {
      ...config,
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
    },
  ],
};
