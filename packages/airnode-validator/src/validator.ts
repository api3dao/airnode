import * as logger from './utils/logger';
import { Log, Result, templates } from './types';
import { processSpecs } from './processor';
import * as utils from './commands/utils';
import { keywords } from './utils/globals';

/**
 * Validates JSON specification with known template
 * @param specs - specification to validate
 * @param templateName - name of the template (ois, config...)
 * @param returnJson - parsed JSON specification will be returned
 */
export function validateJsonWithTemplate(specs: object, templateName: string | undefined, returnJson = false): Result {
  if (!templateName) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  const messages: Log[] = [];

  const templatePath = utils.getPath(templates[templateName.toLowerCase() as keyof typeof templates], messages);

  if (messages.length || !templatePath) {
    return { valid: false, messages };
  }

  let template;

  if ((template = utils.readJson(templatePath, messages)) === undefined) {
    return { valid: false, messages };
  }

  const split = templatePath.split('/');

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/', returnJson);
}

/**
 * Validates specification on provided path with known template
 * @param specsPath - path to specification that will be validated
 * @param templateName - name of the template (ois, config...)
 * @param returnJson - parsed JSON specification will be returned
 */
export function validateWithTemplate(
  specsPath: string | undefined,
  templateName: string | undefined,
  returnJson = false
) {
  if (!specsPath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let specs;
  const messages: Log[] = [];

  if ((specs = utils.readJson(specsPath, messages)) === undefined) {
    return { valid: false, messages };
  }

  return validateJsonWithTemplate(specs, templateName, returnJson);
}

/**
 * Validates specification from provided file according to template file
 * @param specsPath - specification file to validate
 * @param templatePath - template json file
 * @param returnJson - parsed JSON specification will be returned
 * @returns array of error and warning messages
 */
export function validate(specsPath: string | undefined, templatePath: string | undefined, returnJson = false): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
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

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/', returnJson);
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @param returnJson - parsed JSON specification will be returned
 * @returns array of error and warning messages
 */
export function validateJson(specs: object, template: object, templatePath = '', returnJson = false): Result {
  const nonRedundant = template[keywords.arrayItem as keyof typeof template] ? [] : {};
  const result = processSpecs(
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

  return {
    valid: result.valid,
    messages: result.messages,
    specs: returnJson ? specs : undefined,
  };
}
