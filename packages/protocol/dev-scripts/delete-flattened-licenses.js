const replace = require('replace-in-file');

const results = replace.sync({
  files: '*.flat.sol',
  from: /.*SPDX-License-Identifier.*\n/g,
  to: '',
});

console.info(results);
