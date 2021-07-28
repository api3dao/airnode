import * as logger from '../utils/logger';
import { Log } from '../types';
import * as utils from '../utils/utils';
import { keywords } from '../utils/globals';

/**
 * Checks if key or value matches regular expression in template
 * @param specs - specification that is being validated
 * @param template - template containing the regular expression
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param rootSpecs - root of specification that is being validated
 * @param isKeyRegexp - determines if key or value should be checked
 * @returns incorrect formatting message if the parameter key or value did not match regular expression
 */
export function validateRegexp(
  specs: any,
  template: any,
  paramPath: string[],
  rootSpecs: any,
  isKeyRegexp = false
): Log[] {
  const messages: Log[] = [];

  template = utils.replaceParamIndexWithName(template, paramPath);
  template = utils.replacePathsWithValues(specs, rootSpecs, template);

  if (isKeyRegexp) {
    for (const item of Object.keys(specs)) {
      if (!item.match(new RegExp(template[keywords.keyRegexp]))) {
        messages.push(logger.error(`Key ${item} in ${[...paramPath, item].join('.')} is formatted incorrectly`));
      }
    }

    return messages;
  }

  if (typeof specs !== 'string' || !specs.match(new RegExp(template[keywords.regexp]))) {
    messages.push(logger.warn(`${paramPath.join('.')} is not formatted correctly`));
  }

  return messages;
}
