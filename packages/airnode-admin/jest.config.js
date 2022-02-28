const config = require('../../jest.config.base');

module.exports = {
  projects: [
    {
      ...config,
      // Add custom settings below
      name: 'e2e',
      displayName: 'e2e',
      testMatch: ['**/?(*.)+(feature).[tj]s?(x)'],
    },
    {
      ...config,
      // Add custom settings below
      displayName: 'unit',
      name: 'unit',
      testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
    },
  ],
};
