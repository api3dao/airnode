module.exports = {
  extends: ['plugin:functional/external-recommended', 'plugin:functional/recommended', 'plugin:functional/stylitic'],
  plugins: ['functional'],
  rules: {
    'functional/functional-parameters': 0,
    'functional/immutable-data': [
      'error',
      {
        ignoreAccessorPattern: ['module.exports*', 'process.env.**'],
      },
    ],
    'functional/prefer-type-literal': 0,
    'functional/no-conditional-statement': 0,
    'functional/no-expression-statement': 0,
    // variables prefixed with 'mutable' can be mutated
    'functional/no-let': ['error', { ignorePattern: '^mutable' }],
    'functional/no-throw-statement': 0,
    'functional/prefer-readonly-type': ['error', { ignoreCollections: true }],
    'functional/prefer-tacit': 0,
  },
};
