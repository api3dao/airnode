module.exports = {
  plugins: ['functional'],
  rules: {
    // eslint-plugin-functional
    'functional/prefer-tacit': ['error', { assumeTypes: { allowFixer: false } }],
    'functional/immutable-data': ['error', { assumeTypes: true }],
  },
  overrides: [
    {
      files: [
        // Test files
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.feature.ts',
        '**/test/**',
        // Config files
        'jest.config.base.js',
        '.eslintrc.js',
        '.eslintrc.fp.js',
        '**/*.config.js',
        '**/*.config.ts',
      ],
      rules: {
        'functional/immutable-data': 'off',
      },
    },
  ],
};
