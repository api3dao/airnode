import path from 'path';
import * as logger from './utils/logger';
import { Log, Result } from './types';
import { processSpecs } from './processor';
import * as utils from './commands/utils';
import { keywords } from './utils/globals';

/**
 * Validates JSON specification with known template
 * @param specs - specification to validate
 * @param templateName - name of the template (ois, config...)
 * @param interpolate - list of env variables that will be interpolated with specification
 * @param returnJson - parsed JSON specification will be returned
 * @param shouldValidate - if the validator should run the validation
 */
export function validateJsonWithTemplate(
  specs: object,
  templateName: string | undefined,
  shouldValidate: boolean,
  interpolate?: Record<string, string | undefined>,
  returnJson = false
): Result {
  if (!templateName) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  const messages: Log[] = [],
    parsed = utils.parseTemplateName(templateName, messages);
  let version: string | undefined;

  if (!parsed) {
    return { valid: false, messages };
  }

  [templateName, version] = parsed;

  const templatePath = utils.getPath(templateName, messages, version);

  if (messages.length || !templatePath) {
    return { valid: false, messages };
  }

  let template;

  if (!(template = utils.readJson(templatePath, messages))) {
    return { valid: false, messages };
  }

  const split = templatePath.split(path.sep);

  return validateJson(
    specs,
    template,
    split.slice(0, split.length - 1).join(path.sep) + path.sep,
    interpolate,
    returnJson,
    shouldValidate
  );
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

  if (!(specs = utils.readJson(specsPath, messages))) {
    return { valid: false, messages };
  }

  if (interpolatePath) {
    if (!(env = utils.parseEnv(path.resolve(interpolatePath), messages))) {
      return { valid: false, messages };
    }
  }

  return validateJsonWithTemplate(specs, templateName, true, env, returnJson);
}

/**
 * Validates specification from provided file according to template file
 * @param specsPath - specification file to validate
 * @param templatePath - template json file
 * @param interpolatePath - path to env file that will be interpolated with specification file
 * @param returnJson - parsed JSON specification will be returned
 * @param shouldValidate - should the config be validated
 * @returns array of error and warning messages
 */
export function validate(
  specsPath: string | undefined,
  templatePath: string | undefined,
  interpolatePath?: string,
  returnJson = false,
  shouldValidate = true
): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let template, specs, env;
  const messages: Log[] = [];

  if (!(template = utils.readJson(templatePath, messages))) {
    return { valid: false, messages };
  }

  if (!(specs = utils.readJson(specsPath, messages))) {
    return { valid: false, messages };
  }

  if (interpolatePath) {
    if (!(env = utils.parseEnv(path.resolve(interpolatePath), messages))) {
      return { valid: false, messages };
    }
  }

  const split = templatePath.split(path.sep);

  return validateJson(
    specs,
    template,
    split.slice(0, split.length - 1).join(path.sep) + path.sep,
    env,
    returnJson,
    shouldValidate
  );
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @param interpolate - list of env variables that will be interpolated with specification
 * @param returnJson - parsed JSON specification will be returned
 * @param shouldValidate - should the config be validated
 * @returns array of error and warning messages
 */
export function validateJson(
  specs: object,
  template: object,
  templatePath = '',
  interpolate?: Record<string, string | undefined>,
  returnJson = false,
  shouldValidate = true
): Result {
  const messages: Log[] = [];
  let interpolated: object | undefined = specs;

  if (interpolate) {
    if (!(interpolated = utils.interpolate(specs, interpolate, messages))) {
      return { valid: false, messages };
    }
  }

  const nonRedundant = template[keywords.arrayItem as keyof typeof template] ? [] : {};
  if (!shouldValidate) {
    return {
      valid: true,
      messages: [],
      specs: returnJson ? interpolated : undefined,
    };
  }

  const result = processSpecs(
    interpolated,
    template,
    [],
    nonRedundant,
    {
      specs: interpolated,
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
