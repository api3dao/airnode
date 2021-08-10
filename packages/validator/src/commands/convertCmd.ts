import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import * as logger from '../utils/logger';
import { convert, convertJson } from '../convertor';
import { Log, Result } from '../types';
import { invalidConversionMessage } from '../utils/messages';

const oas2ois = 'OAS2OIS.json';
const ois2config = 'OIS2Config.json';

const args = yargs(hideBin(process.argv))
  .option('from', {
    description: 'Name of the source airnode specification format',
    default: '',
    type: 'string',
  })
  .option('to', {
    description: 'Name of the target airnode specification format',
    default: '',
    type: 'string',
  })
  .option('template', {
    description: 'Path to validator template file',
    alias: 't',
    default: '',
    type: 'string',
  })
  .option('specification', {
    description: 'Path to specification file that will be validated',
    default: '',
    alias: ['specs', 's'],
    type: 'string',
  })
  .option('specs-only', {
    description: 'Instead of standard validator output, only the result of conversion will be returned',
  })
  .parseSync();

if (args.template) {
  console.log(JSON.stringify(convert(args.specification, args.template), null, 2));
} else {
  const messages: Log[] = [];
  let res: Result = { valid: false, messages: [], output: {} };
  args.from = args.from.toLowerCase();
  args.to = args.to.toLowerCase();

  if (!args.from || !args.to) {
    res.messages.push(logger.error('Conversion source and target specification must be provided'));
  } else if (args.from === 'oas' && args.to === 'ois') {
    res = convert(args.specification, utils.getPath(oas2ois, messages));
    res.messages.push(...messages);
  } else if (args.from === 'ois' && args.to === 'config') {
    res = convert(args.specification, utils.getPath(ois2config, messages));
  } else if (args.from === 'oas' && args.to === 'config') {
    const tmp = convert(args.specification, utils.getPath(oas2ois, messages));
    let templatePath: string | string[] = utils.getPath(ois2config, messages);
    const template = JSON.parse(fs.readFileSync(templatePath).toString());
    templatePath = templatePath.split('/');

    if (tmp.output && template) {
      res = convertJson(tmp.output, template, templatePath.slice(0, templatePath.length - 1).join('/') + '/');
      res.messages.push(...tmp.messages);
    } else {
      res = tmp;
    }
  } else {
    messages.push(invalidConversionMessage(args.from, args.to));
  }

  res.messages.push(...messages);
  console.log(JSON.stringify(args['specs-only'] ? res.output : res, null, 2));
}
