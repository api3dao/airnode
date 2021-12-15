import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import { validate, validateWithTemplate } from '../validator';
import { Log, Result } from '../types';

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

let res: Result;

if (utils.parseTemplateName(args.template, messages)) {
  res = validateWithTemplate(args.specification, args.template, args.secrets);
} else {
  res = validate(args.specification, args.template, args.secrets);
}

console.log(JSON.stringify(res, null, 2));
