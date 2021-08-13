import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import { convert } from '../convertor';
import { Log } from '../types';

const args = yargs(hideBin(process.argv))
  .option('from', {
    description: 'Name of the source airnode specification format',
    type: 'string',
    implies: 'to',
  })
  .option('to', {
    description: 'Name of the target airnode specification format',
    type: 'string',
    implies: 'from',
  })
  .option('template', {
    description: 'Path to validator template file',
    alias: 't',
    conflicts: ['from', 'to'],
    type: 'string',
  })
  .option('specification', {
    description: 'Path to specification file that will be validated',
    alias: ['specs', 's'],
    type: 'string',
    demandOption: true,
  })
  .option('specs-only', {
    description: 'Instead of standard validator output, only the result of conversion will be returned',
    type: 'boolean',
    default: false,
  })
  .check((argv) => {
    if (!argv.template && !argv.from) {
      throw new Error(`You have to provide either template or specification formats for conversion`);
    }

    return true;
  })
  .parseSync();

if (args.template) {
  console.log(JSON.stringify(convert(args.specification, args.template), null, 2));
  process.exit();
}

const messages: Log[] = [];
const [from, fromVersion] = args.from!.toLowerCase().split('@');
const [to, toVersion] = args.to!.toLowerCase().split('@');

const templatePath = utils.getConversionPath(from, to, messages, fromVersion, toVersion);

if (templatePath) {
  const res = convert(args.specification, templatePath);
  console.log(JSON.stringify(args['specs-only'] ? res.output : res, null, 2));
} else {
  console.log(JSON.stringify(messages, null, 2));
}
