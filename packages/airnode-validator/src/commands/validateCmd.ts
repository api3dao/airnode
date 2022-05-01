import path from 'path';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from '@api3/airnode-utilities';
import { parseConfig } from '../api';

const args = yargs(hideBin(process.argv))
  .option('specification', {
    description: 'Path to specification file that will be validated',
    alias: ['specs', 's'],
    type: 'string',
    demandOption: true,
  })
  .option('secrets', {
    description: 'Path to .env file that will be interpolated with specification',
    alias: 'i',
    type: 'string',
  })
  .parseSync();

// TODO: implement v2 validator cli
const res = (() => {
  const config = JSON.parse(readFileSync(path.resolve(args.specification)).toString());
  return parseConfig(config);
})();

logger.log(JSON.stringify(res, null, 2));
