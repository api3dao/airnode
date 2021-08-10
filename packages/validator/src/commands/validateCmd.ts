import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import * as logger from '../utils/logger';
import { validate } from '../validator';
import { Log, templates } from '../types';

const messages: Log[] = [];

const args = yargs(hideBin(process.argv))
  .option('template', {
    description: 'Path to validator template file or name of airnode specification format',
    default: '',
    alias: 't',
    type: 'string',
  })
  .option('specification', {
    description: 'Path to specification file that will be validated',
    default: '',
    alias: ['specs', 's'],
    type: 'string',
  })
  .parseSync();

// eslint-disable-next-line prefer-const
let [template, version] = args.template.split('@');

if (template) {
  if (templates[template.toLowerCase() as keyof typeof templates]) {
    template = utils.getPath(templates[template.toLowerCase() as keyof typeof templates], messages, version);
  } else if (version) {
    messages.push(logger.warn('Version argument will be ignored when validating provided template file'));
  }

  if (args['specification']) {
    const res = validate(args['specification'], template);
    res.messages.push(...messages);
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(logger.error('Path to json specification must be provided'));
  }
} else {
  console.log(logger.error('Validator template must be provided'));
}
