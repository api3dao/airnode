import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { convert, convertWithTemplate } from '../convertor';

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
  .option('secrets', {
    description: 'Path to .env file that will be interpolated with specification',
    alias: 'i',
    type: 'string',
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
  console.log(JSON.stringify(convert(args.specification, args.template, args.secrets), null, 2));
  process.exit();
}

console.log(JSON.stringify(convertWithTemplate(args.specification, args.from, args.to, args.secrets), null, 2));
