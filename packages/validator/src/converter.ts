import { Result } from './types';
import * as logger from './utils/logger';
import fs from 'fs';
import { processSpecs } from './processor';

/**
 * Converts specification from provided file into format the template specifies
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
    template = fs.readFileSync(templatePath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)], output: {} };
  }

  try {
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)], output: {} };
  }

  return convertJson(specs, template);
}

/**
 * Converts specification from provided string and converts it into format the template specifies
 * @param specs - specification to convert, root must be an object (not an array)
 * @param template - template json
 * @returns array of messages and converted specification
 */
export function convertJson(specs: string, template: string): Result {
  try {
    const nonRedundant = {};
    const output = {};
    const parsedTemplate = JSON.parse(template);
    const parsedSpecs = JSON.parse(specs);

    const result = processSpecs(parsedSpecs, parsedTemplate, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
      output,
    });

    return { valid: result.valid, messages: result.messages, output: JSON.parse(JSON.stringify(output)) };
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }], output: {} };
  }
}
