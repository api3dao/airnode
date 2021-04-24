import { convert, convertJson } from '../convertor';
import { Log, Result } from '../types';
import * as utils from './utils';
import fs from 'fs';
import { invalidConversionMessage } from '../utils/messages';

const oas2ois = 'OAS2OIS.json';
const ois2config = 'OAS2OIS.json';

if (process.env.npm_config_template) {
  console.log(
    JSON.stringify(
      convert(process.env.npm_config_specs || process.argv[3], process.env.npm_config_template),
      null,
      '\t'
    )
  );
} else {
  const from = (process.env.npm_config_from || process.argv[2]).toLowerCase();
  const to = (process.env.npm_config_to || process.argv[3]).toLowerCase();
  const specs = process.env.npm_config_specs || process.argv[4];
  const version = process.env.npm_config_fromVersion || process.argv[5];
  const messages: Log[] = [];
  let res: Result = { valid: false, messages: [], output: {} };

  if (from === 'oas' && to === 'ois') {
    res = convert(specs, utils.getPath(oas2ois, messages, version));
    res.messages.push(...messages);
  } else if (from === 'ois' && to === 'config') {
    res = convert(specs, utils.getPath(ois2config, messages, version));
  } else if (from === 'oas' && to === 'config') {
    const tmp = convert(specs, utils.getPath(oas2ois, messages, version));
    const templatePath = utils.getPath(ois2config, messages);
    const template = JSON.parse(fs.readFileSync(templatePath).toString());

    if (tmp.output && template) {
      res = convertJson(tmp.output, template, templatePath);
    } else {
      res = tmp;
    }
  } else {
    messages.push(invalidConversionMessage(from, to));
  }

  res.messages.push(...messages);
  console.log(JSON.stringify(res, null, '\t'));
}
