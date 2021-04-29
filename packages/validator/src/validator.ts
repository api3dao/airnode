import fs from 'fs';
import * as logger from './utils/logger';
import { Result } from './types';
import { processSpecs } from './processor';

/**
 * Validates specification from provided file according to template file
 * @param specsPath - specification file to validate, root must be an object (not an array)
 * @param templatePath - template json file
 * @returns array of error and warning messages
 */
export function validate(specsPath: string | undefined, templatePath: string | undefined): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let template, specs;

  try {
    template = fs.readFileSync(templatePath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)] };
  }

  try {
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
  }

  try {
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)] };
  }

  try {
    specs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${specsPath} is not valid JSON: ${e}`)] };
  }

  const split = templatePath.split('/');

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/');
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate, root must be an object (not an array)
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @returns array of error and warning messages
 */
export function validateJson(specs: object, template: object, templatePath = ''): Result {
  const nonRedundant = template['__arrayItem'] ? [] : {};

  return processSpecs(
    specs,
    template,
    [],
    nonRedundant,
    {
      specs: specs,
      nonRedundantParams: nonRedundant,
      output: {},
    },
    templatePath
  );
}
