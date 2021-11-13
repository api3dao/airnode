import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as utils from './utils';
import * as logger from '../utils/logger';
import { validate, validateJson } from '../validator';
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
  .option('interpolate', {
    description: 'Path to .env file that will be interpolated with specification',
    alias: 'i',
    type: 'string'
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

let res: Log[] | Result | undefined = undefined;

if (templatePath) {
  if (args.interpolate) {
    const msgs: Log[] = [];
    const interpolated = utils.interpolateFiles(args.specification, args.interpolate, msgs);

    if (msgs.length) {
      res = messages;
      res.push(...msgs);
    } else {
      try {
        const templateStr = fs.readFileSync(templatePath, 'utf-8');

        try {
          const template = JSON.parse(templateStr);
          res = validateJson(interpolated, template, templatePath.replace(/config\.json$/, ''));
          res.messages.push(...messages);
        } catch (e) {
          messages.push(logger.error(`${templatePath} is not valid JSON: ${e}`));
        }

      } catch (e) {
        messages.push(logger.error(`Unable to read file ${templatePath}`));
      }

      if (res === undefined) {
        res = messages;
      }
    }
  } else {
    res = validate(args.specification, templatePath);
    res.messages.push(...messages);
  }
} else {
  res = messages;
}

console.log(JSON.stringify(res, null, 2));
