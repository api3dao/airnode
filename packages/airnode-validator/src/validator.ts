import path from 'path';
import * as logger from './utils/logger';
import { Log, Result, templates } from './types';
import { processSpecs } from './processor';
import * as utils from './commands/utils';
import { keywords } from './utils/globals';

/**
 * Validates JSON specification with known template
 * @param specs - specification to validate
 * @param templateName - name of the template (ois, config...)
 * @param interpolate - list of env variables that will be interpolated with specification
 * @param returnJson - parsed JSON specification will be returned
 */
export function validateJsonWithTemplate(
  specs: object,
  templateName: string | undefined,
  interpolate?: Record<string, string | undefined>,
  returnJson = false
): Result {
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

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/', interpolate, returnJson);
}

/**
 * Validates specification on provided path with known template
 * @param specsPath - path to specification that will be validated
 * @param templateName - name of the template (ois, config...)
 * @param interpolatePath - path to env file that will be interpolated with specification file
 * @param returnJson - parsed JSON specification will be returned
 */
export function validateWithTemplate(
  specsPath: string | undefined,
  templateName: string | undefined,
  interpolatePath?: string | undefined,
  returnJson = false
) {
  if (!specsPath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let specs, env;
  const messages: Log[] = [];

  if ((specs = utils.readJson(specsPath, messages)) === undefined) {
    return { valid: false, messages };
  }

  if (interpolatePath) {
    if ((env = utils.parseEnv(path.resolve(interpolatePath), messages)) === undefined) {
      return { valid: false, messages };
    }
  }

  return validateJsonWithTemplate(specs, templateName, env, returnJson);
}

/**
 * Validates specification from provided file according to template file
 * @param specsPath - specification file to validate
 * @param templatePath - template json file
 * @param interpolatePath - path to env file that will be interpolated with specification file
 * @param returnJson - parsed JSON specification will be returned
 * @returns array of error and warning messages
 */
export function validate(
  specsPath: string | undefined,
  templatePath: string | undefined,
  interpolatePath?: string,
  returnJson = false
): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let template, specs, env;
  const messages: Log[] = [];

  if ((template = utils.readJson(templatePath, messages)) === undefined) {
    return { valid: false, messages };
  }

  if ((specs = utils.readJson(specsPath, messages)) === undefined) {
    return { valid: false, messages };
  }

  if (interpolatePath) {
    if ((env = utils.parseEnv(path.resolve(interpolatePath), messages)) === undefined) {
      return { valid: false, messages };
    }
  }

  const split = templatePath.split('/');

  return validateJson(specs, template, split.slice(0, split.length - 1).join('/') + '/', env, returnJson);
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @param interpolate - list of env variables that will be interpolated with specification
 * @param returnJson - parsed JSON specification will be returned
 * @returns array of error and warning messages
 */
export function validateJson(
  specs: object,
  template: object,
  templatePath = '',
  interpolate?: Record<string, string | undefined>,
  returnJson = false
): Result {
  const messages: Log[] = [];
  let interpolated: object | undefined = specs;

  if (interpolate) {
    if ((interpolated = utils.interpolate(specs, interpolate, messages)) === undefined) {
      return { valid: false, messages };
    }
  }

  const nonRedundant = template[keywords.arrayItem as keyof typeof template] ? [] : {};
  const result = processSpecs(
    interpolated,
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
    specs: returnJson ? interpolated : undefined,
  };
}
