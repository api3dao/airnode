import { Log, Result } from './types';
import * as logger from './utils/logger';
import { processSpecs } from './processor';
import * as utils from './commands/utils';

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
  const messages: Log[] = [];

  if ((template = utils.readJson(templatePath, messages)) === undefined) {
    return { valid: false, messages };
  }

  if ((specs = utils.readJson(specsPath, messages)) === undefined) {
    return { valid: false, messages };
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
