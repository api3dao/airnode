module.exports = {
  extends: ['plugin:functional/external-recommended', 'plugin:functional/recommended', 'plugin:functional/stylitic'],
  plugins: ['functional'],
  rules: {
    'functional/functional-parameters': 0,
    'functional/immutable-data': [
      'error',
      {
        ignoreAccessorPattern: ['module.exports*'],
      },
    ],
    'functional/no-conditional-statement': 0,
    'functional/no-expression-statement': 0,
    'functional/no-throw-statement': 0,
  },
};
