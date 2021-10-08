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
    waffle: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jest/recommended',
  ],
  plugins: ['@typescript-eslint', 'import', 'jest'],
  rules: {
    // TypeScript
    '@typescript-eslint/ban-ts-comment': 0,
    '@typescript-eslint/ban-ts-ignore': 0,
    '@typescript-eslint/ban-types': 0,
    '@typescript-eslint/camelcase': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    // Turning off, because it conflicts with prettier
    '@typescript-eslint/indent': ['off'],
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    // Leave vars as 'all' to force everything to be handled when pattern matching
    // Variables can be ignored by prefixing with an '_'
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', vars: 'all' }],
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-var-requires': 0,

    // eslint-plugin-import
    'import/namespace': [2, { allowComputed: true }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'sibling', 'parent', 'index', 'object', 'type'],
        pathGroups: [{ pattern: 'mock-utils', group: 'builtin', patternOptions: { matchBase: true, nocomment: true } }],
      },
    ],

    // ESLint
    'comma-dangle': [2, 'only-multiline'],
    indent: 'off',
    'no-console': 0,
    'no-useless-escape': 0,
    semi: 2,
    eqeqeq: ['error', 'smart'],
  },
};
