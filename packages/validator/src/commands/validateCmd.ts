import * as utils from './utils';
import * as logger from '../utils/logger';
import { validate } from '../validator';
import { Log, templates } from '../types';

let template = process.env.npm_config_template || process.argv[2];
const specs = process.env.npm_config_specs || process.argv[3];
const version = process.env.npm_config_templateVersion || process.argv[4];

const messages: Log[] = [];

if (template) {
  if (templates[template.toLowerCase() as keyof typeof templates]) {
    template = utils.getPath(templates[template.toLowerCase() as keyof typeof templates], messages, version);
  } else if (version) {
    messages.push(logger.warn('Version argument will be ignored when validating provided template file'));
  }

  if (specs) {
    const res = validate(specs, template);
    res.messages.push(...messages);
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(logger.error('Path to json specification must be provided'));
  }
} else {
  console.log(logger.error('Validator template must be provided'));
}
