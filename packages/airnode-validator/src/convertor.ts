import fs from 'fs';

import { Result } from './types';
import * as logger from './utils/logger';
import { processSpecs } from './processor';

const path = require('path');

/**
 * Converts a specification according to the template
 * @param specsPath - specification file to convert, root must be an object (not an array)
 * @param templatePath - template json file
 * @returns array of messages and converted specification
 */
export function convert(specsPath: string | undefined, templatePath: string | undefined): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')], output: {} };
  }

  let template, specs;

  try {
    template = fs.readFileSync(path.resolve(templatePath), 'utf-8');
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${path.resolve(templatePath)}`)], output: {} };
  }

  try {
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
  }

  try {
    specs = fs.readFileSync(path.resolve(specsPath), 'utf-8');
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${path.resolve(specsPath)}`)], output: {} };
  }

  try {
    specs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${specsPath} is not valid JSON: ${e}`)] };
  }

  const split = templatePath.split('/');

  return convertJson(specs, template, split.slice(0, split.length - 1).join('/') + '/');
}

/**
 * Converts specification from provided string and converts it into format the template specifies
 * @param specs - specification to convert, root must be an object (not an array)
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @returns array of messages and converted specification
 */
export function convertJson(specs: object, template: object, templatePath = ''): Result {
  const nonRedundant = {};
  const output = {};

  const result = processSpecs(
    specs,
    template,
    [],
    nonRedundant,
    {
      specs: specs,
      nonRedundantParams: nonRedundant,
      output,
    },
    templatePath
  );

  return { valid: result.valid, messages: result.messages, output: JSON.parse(JSON.stringify(result.output)) };
}
