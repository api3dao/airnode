module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    'functional/immutable-data': 'off', // It is fine to use mutation for test only package
  },
};
