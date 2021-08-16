import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import { convert, convertJson } from '../convertor';
import { Log, Result } from '../types';

const oas2ois = 'OAS2OIS.json';
const ois2config = 'OIS2Config.json';

type FromChoices = 'oas' | 'ois';
const fromChoices: ReadonlyArray<FromChoices> = ['oas', 'ois'];
type ToChoices = 'ois' | 'config';
const toChoices: ReadonlyArray<ToChoices> = ['ois', 'config'];

const supportedConversions = [
  ['oas', 'ois'],
  ['oas', 'config'],
  ['ois', 'config'],
];

const args = yargs(hideBin(process.argv))
  .option('from', {
    description: 'Name of the source airnode specification format',
    choices: fromChoices,
    implies: 'to',
  })
  .option('to', {
    description: 'Name of the target airnode specification format',
    choices: toChoices,
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
  .check((argv) => {
    if (!argv.template) {
      const supported = supportedConversions.reduce(
        (result, conversion) => result || (conversion[0] === argv.from && conversion[1] === argv.to),
        false
      );
      if (!supported) {
        throw new Error(`Unknown conversion from ${argv.from} to ${argv.to}`);
      }
    }

    return true;
  })
  .parseSync();

if (args.template) {
  console.log(JSON.stringify(convert(args.specification, args.template), null, 2));
  process.exit();
}

const messages: Log[] = [];
let res: Result = { valid: false, messages: [], output: {} };
const from = args.from!.toLowerCase();
const to = args.to!.toLowerCase();

if (from === 'oas' && to === 'ois') {
  res = convert(args.specification, utils.getPath(oas2ois, messages));
}
if (from === 'ois' && to === 'config') {
  res = convert(args.specification, utils.getPath(ois2config, messages));
}
if (from === 'oas' && to === 'config') {
  const tmp = convert(args.specification, utils.getPath(oas2ois, messages));
  const templatePath = utils.getPath(ois2config, messages);
  const template = JSON.parse(fs.readFileSync(templatePath).toString());
  const templatePathParts = templatePath.split('/');

  if (tmp.output && template) {
    res = convertJson(tmp.output, template, templatePathParts.slice(0, templatePathParts.length - 1).join('/') + '/');
    res.messages.push(...tmp.messages);
  } else {
    res = tmp;
  }
}

res.messages.push(...messages);
console.log(JSON.stringify(args['specs-only'] ? res.output : res, null, 2));
