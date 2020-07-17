module.exports = {
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/ban-ts-ignore': 0,
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/camelcase': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/no-unused-vars': ['error', { vars: 'all' }],
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-var-requires': 0,

    // ESLint
    'comma-dangle': [2, 'only-multiline'],
    indent: 'off',
    'no-console': 0,
    'no-useless-escape': 0,
    semi: 2,
  },
};
