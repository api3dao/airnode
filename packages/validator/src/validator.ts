import fs from 'fs';
import * as logger from './utils/logger';
import { Log, Result, templates } from './types';
import { processSpecs } from './processor';
import * as utils from './commands/utils';

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

  try {
    template = fs.readFileSync(templatePath, 'utf-8');
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)] };
  }

  try {
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
  }

  try {
    specs = fs.readFileSync(specsPath, 'utf-8');
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)] };
  }

  try {
    specs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${specsPath} is not valid JSON: ${e}`)] };
  }

  const split = templatePath.split('/');

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/', returnJson);
}

/**
 * Validates specification with known template
 * @param specs - specification to validate
 * @param templateName - name of the template (ois, config...)
 * @param returnJson - parsed JSON specification will be returned
 */
export function validateWithTemplate(specs: object, templateName: string | undefined, returnJson = false): Result {
  if (!templateName) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  const messages: Log[] = [];

  const templatePath = utils.getPath(templates[templateName.toLowerCase() as keyof typeof templates], messages);

  if (messages.length) {
    return { valid: false, messages };
  }

  let template;

  try {
    template = fs.readFileSync(templatePath, 'utf-8');
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)] };
  }

  try {
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
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
  const nonRedundant = template['__arrayItem' as keyof typeof template] ? [] : {};

  return {
    ...processSpecs(
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
    ),
    specs: returnJson ? specs : undefined,
  };
}
