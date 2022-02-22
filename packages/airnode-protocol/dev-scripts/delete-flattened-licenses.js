const replace = require('replace-in-file');
const { log } = require('@api3/airnode-utilities');

const results = replace.sync({
  files: '*.flat.sol',
  from: /.*SPDX-License-Identifier.*\n/g,
  to: '',
});

log(results);
