import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import * as logger from '../utils/logger';
import { validate } from '../validator';
import { Log, Result, templates } from '../types';

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

let templatePath: string | null, version: string;
// eslint-disable-next-line prefer-const
[templatePath, version] = args.template.split('@');

if (templates[templatePath.toLowerCase() as keyof typeof templates]) {
  templatePath = utils.getPath(templates[templatePath.toLowerCase() as keyof typeof templates], messages, version);
} else if (version) {
  messages.push(logger.warn('Version argument will be ignored when validating provided template file'));
}

let res: Log[] | Result;

if (templatePath) {
  res = validate(args.specification, templatePath, args.secrets);
  res.messages.push(...messages);
} else {
  res = messages;
}

console.log(JSON.stringify(res, null, 2));
