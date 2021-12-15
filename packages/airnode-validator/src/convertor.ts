import path from 'path';
import { Log, Result } from './types';
import * as logger from './utils/logger';
import { processSpecs } from './processor';
import * as utils from './commands/utils';

/**
 * Converts a specification according to the template
 * @param specsPath - specification file to convert
 * @param templatePath - template json file
 * @param interpolatePath - path to env file that will be interpolated with specification file
 * @returns array of messages and converted specification
 */
export function convert(
  specsPath: string | undefined,
  templatePath: string | undefined,
  interpolatePath?: string
): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')], output: {} };
  }

  let template, specs;
  const messages: Log[] = [];

  if (!(template = utils.readJson(templatePath, messages))) {
    return { valid: false, messages };
  }

  if (!(specs = utils.readJson(specsPath, messages))) {
    return { valid: false, messages };
  }

  let env = undefined;

  if (interpolatePath) {
    if (!(env = utils.parseEnv(interpolatePath, messages))) {
      return { valid: false, messages };
    }
  }

  const split = templatePath.split(path.sep);

  return convertJson(specs, template, split.slice(0, split.length - 1).join(path.sep) + path.sep, env);
}

/**
 * Converts a specification from provided format to specified format
 * @param specsPath specification file to convert
 * @param fromTemplateName format name of specification file
 * @param toTemplateName name of format to which the specification will be converted to
 * @param interpolatePath path to env file that will be interpolated with specification file
 */
export function convertWithTemplate(
  specsPath: string | undefined,
  fromTemplateName: string | undefined,
  toTemplateName: string | undefined,
  interpolatePath?: string
): Result {
  if (!fromTemplateName) {
    return { valid: false, messages: [logger.error('Valid from template name must be provided')] };
  }

  if (!toTemplateName) {
    return { valid: false, messages: [logger.error('Valid from template name must be provided')] };
  }

  const messages: Log[] = [];
  let fromVersion, toVersion;

  [fromTemplateName, fromVersion] = fromTemplateName.split('@');
  [toTemplateName, toVersion] = toTemplateName.split('@');

  const templatePath = utils.getConversionPath(fromTemplateName, toTemplateName, messages, fromVersion, toVersion);

  if (!templatePath) {
    return { valid: false, messages };
  }

  return convert(specsPath, templatePath, interpolatePath);
}

/**
 * Converts specification from provided string and converts it into format the template specifies
 * @param specs - specification to convert
 * @param template - template json
 * @param interpolate - list of env variables that will be interpolated with specification
 * @param templatePath - path to current validator template file
 * @returns array of messages and converted specification
 */
export function convertJson(
  specs: object,
  template: object,
  templatePath = '',
  interpolate?: Record<string, string | undefined>
): Result {
  const nonRedundant = {},
    output = {},
    messages: Log[] = [];
  let interpolated: object | undefined = specs;

  if (interpolate) {
    if (!(interpolated = utils.interpolate(specs, interpolate, messages))) {
      return { valid: false, messages };
    }
  }

  const result = processSpecs(
    interpolated,
    template,
    [],
    nonRedundant,
    {
      specs: interpolated,
      nonRedundantParams: nonRedundant,
      output,
    },
    templatePath
  );

  return { valid: result.valid, messages: result.messages, output: JSON.parse(JSON.stringify(result.output)) };
}
