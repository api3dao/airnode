import * as logger from '../utils/logger';
import { Log } from '../types';
import { combinePaths } from '../utils/utils';

/**
 * Checks if key or value matches regular expression in template
 * @param specs - specification that is being validated
 * @param template - template containing the regular expression
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param isKeyRegexp - determines if key or value should be checked
 * @returns incorrect formatting message if the parameter key or value did not match regular expression
 */
export function validateRegexp(specs: any, template: any, paramPath: string, isKeyRegexp = false): Log[] {
  const messages: Log[] = [];

  if (isKeyRegexp) {
    for (const item of Object.keys(specs)) {
      if (!item.match(new RegExp(template['__keyRegexp']))) {
        messages.push(logger.error(`Key ${item} in ${combinePaths(paramPath, item)} is formatted incorrectly`));
      }
    }

    return messages;
  }

  if (typeof specs !== 'string' || !specs.match(new RegExp(template['__regexp']))) {
    const level = template['__level'] || 'warning';
    const message = `${paramPath} is not formatted correctly`;

    messages.push(level === 'error' ? logger.error(message) : logger.warn(message));
  }

  return messages;
}
