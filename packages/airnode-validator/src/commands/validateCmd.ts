import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { log } from '@api3/airnode-utilities';
import * as utils from './utils';
import { validate, validateWithTemplate } from '../validator';
import { Log } from '../types';

const messages: Log[] = [];

const args = yargs(hideBin(process.argv))
  .option('template', {
    description: 'Path to validator template file or name of airnode specification format',
    alias: 't',
    type: 'string',
    demandOption: true,
  })
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

const res = utils.parseTemplateName(args.template, messages)
  ? validateWithTemplate(args.specification, args.template, args.secrets)
  : validate(args.specification, args.template, args.secrets);

log(JSON.stringify(res, null, 2));
