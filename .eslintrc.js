module.exports = {
  env: {
    es6: true,
    jest: true,
    mocha: true,
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
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jest/recommended',
    '.eslintrc.fp.js',
  ],
  plugins: ['@typescript-eslint', 'import', 'jest'],
  rules: {
    // TypeScript
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // Turning off, because it conflicts with prettier
    '@typescript-eslint/indent': ['off'],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    // Leave vars as 'all' to force everything to be handled when pattern matching
    // Variables can be ignored by prefixing with an '_'
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', vars: 'all' }],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-var-requires': 'off',

    // eslint-plugin-import
    'import/namespace': ['error', { allowComputed: true }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'sibling', 'parent', 'index', 'object', 'type'],
        pathGroups: [{ pattern: 'mock-utils', group: 'builtin', patternOptions: { matchBase: true, nocomment: true } }],
      },
    ],

    // ESLint
    'comma-dangle': ['error', 'only-multiline'],
    indent: 'off',
    'no-console': 'error',
    'no-useless-escape': 'off',
    semi: 'error',
    eqeqeq: ['error', 'smart'],

    // Other
    'require-await': 'error',
    'no-return-await': 'error',
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
      },
    },
  },
};
