module.exports = {
  extends: [
    '../../.eslintrc.fp.js',
    '../../.eslintrc.js',
  ],
  rules: {
    'functional/immutable-data': 0,
    'functional/no-loop-statement': 0,
    'functional/prefer-readonly-type': 0,
  }
};
