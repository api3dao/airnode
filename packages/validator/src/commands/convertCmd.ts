import fs from 'fs';

import * as utils from './utils';
import * as logger from '../utils/logger';
import { convert, convertJson } from '../convertor';
import { Log, Result } from '../types';
import { invalidConversionMessage } from '../utils/messages';

const oas2ois = 'OAS2OIS.json';
const ois2config = 'OIS2Config.json';

if (process.env.npm_config_template) {
  console.log(
    JSON.stringify(convert(process.env.npm_config_specs || process.argv[3], process.env.npm_config_template), null, 2)
  );
} else {
  const from = (process.env.npm_config_from || process.argv[2] || '').toLowerCase();
  const to = (process.env.npm_config_to || process.argv[3] || '').toLowerCase();
  const specs = process.env.npm_config_specs || process.argv[4];
  const version = process.env.npm_config_fromVersion || process.argv[5];
  const messages: Log[] = [];
  let res: Result = { valid: false, messages: [], output: {} };

  if (!from || !to) {
    res.messages.push(logger.error('Conversion source and target specification must be provided'));
  } else if (from === 'oas' && to === 'ois') {
    res = convert(specs, utils.getPath(oas2ois, messages, version));
    res.messages.push(...messages);
  } else if (from === 'ois' && to === 'config') {
    res = convert(specs, utils.getPath(ois2config, messages, version));
  } else if (from === 'oas' && to === 'config') {
    const tmp = convert(specs, utils.getPath(oas2ois, messages, version));
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
    messages.push(invalidConversionMessage(from, to));
  }

  res.messages.push(...messages);
  console.log(
    JSON.stringify(process.env.npm_config_specs_only || process.env.npm_config_so ? res.output : res, null, 2)
  );
}
