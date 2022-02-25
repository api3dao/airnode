const replace = require('replace-in-file');

const results = replace.sync({
  files: '*.flat.sol',
  from: /.*SPDX-License-Identifier.*\n/g,
  to: '',
});

// eslint-disable-next-line no-console
console.log(results);
